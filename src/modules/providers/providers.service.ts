import prisma from "../../config/prisma";
import { getPaginationParams } from "../../utils/response";
import { OrderStatus } from "@prisma/client";

interface ProviderProfileUpdate {
  restaurantName?: string;
  description?: string;
  logo?: string;
  banner?: string;
  cuisineTypes?: string[];
  address?: string;
  city?: string;
  phone?: string;
}

const ORDER_TRANSITIONS: Record<string, OrderStatus[]> = {
  PLACED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"],
};

export class ProviderService {
  async getAll(filters: { page?: string; limit?: string; city?: string; search?: string }) {
    const { page, limit, city, search } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const where: any = { status: "APPROVED", user: { status: "ACTIVE" } };
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (search) {
      where.OR = [
        { restaurantName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        include: {
          user: true,
          meals: true,
        },
        orderBy: { rating: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.providerProfile.count({ where }),
    ]);

    return { providers, total, page: pageNum, limit: limitNum };
  }

  async getById(id: string) {
    const provider = await prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { status: true, createdAt: true } },
        meals: {
          where: { isAvailable: true },
          include: { category: { select: { id: true, name: true, slug: true } } },
          orderBy: { rating: "desc" },
        },
        _count: { select: { meals: true } },
      },
    });

    if (!provider) throw { statusCode: 404, message: "Provider not found." };
    if (provider.status !== "APPROVED") {
      throw { statusCode: 404, message: "Provider not found." };
    }
    if (provider.user.status === "SUSPENDED") {
      throw { statusCode: 403, message: "This provider is currently unavailable." };
    }

    const reviewAggregate = await prisma.review.aggregate({
      where: { meal: { providerId: provider.id } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...provider,
      rating: reviewAggregate._avg.rating
        ? Math.round(reviewAggregate._avg.rating * 10) / 10
        : provider.rating,
      totalReviews: reviewAggregate._count.rating,
    };
  }

  async updateProfile(userId: string, data: ProviderProfileUpdate) {
    const profile = await this._getProviderProfile(userId);

    return prisma.providerProfile.update({ where: { userId }, data });
  }

  async getMyProfile(userId: string) {
    return prisma.providerProfile.findUnique({ where: { userId } });
  }

  async getDashboardStats(userId: string) {
    const profile = await this._getProviderProfile(userId, false);
    if (profile.status !== "APPROVED") {
      return {
        profile,
        stats: {
          totalMeals: 0,
          totalOrders: 0,
          pendingOrders: 0,
          preparingOrders: 0,
          readyOrders: 0,
          deliveredOrders: 0,
          totalRevenue: 0,
        },
        recentOrders: [],
        popularMeals: [],
      };
    }

    const providerMealFilter = { items: { some: { meal: { providerId: profile.id } } } };

    const [totalMeals, totalOrders, pendingOrders, preparingOrders, readyOrders, deliveredOrders, revenueData, recentOrders, popularMeals] = await Promise.all([
      prisma.meal.count({ where: { providerId: profile.id } }),
      prisma.order.count({ where: providerMealFilter }),
      prisma.order.count({ where: { ...providerMealFilter, status: "PLACED" } }),
      prisma.order.count({ where: { ...providerMealFilter, status: "PREPARING" } }),
      prisma.order.count({ where: { ...providerMealFilter, status: "READY" } }),
      prisma.order.count({ where: { ...providerMealFilter, status: "DELIVERED" } }),
      prisma.order.aggregate({
        where: { ...providerMealFilter, status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: providerMealFilter,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { include: { meal: { select: { title: true, price: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.meal.findMany({
        where: { providerId: profile.id },
        orderBy: { rating: "desc" },
        take: 5,
        select: { id: true, title: true, image: true, price: true, rating: true, totalReviews: true, _count: { select: { orderItems: true } } },
      }),
    ]);

    return {
      profile,
      stats: {
        totalMeals,
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        deliveredOrders,
        totalRevenue: revenueData._sum.totalAmount || 0,
      },
      recentOrders,
      popularMeals,
    };
  }

  async getProviderOrders(userId: string, filters: { page?: string; limit?: string; status?: string }) {
    const profile = await this._getProviderProfile(userId, true);

    const { page, limit, status } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const where: any = { items: { some: { meal: { providerId: profile.id } } } };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { include: { meal: { select: { title: true, image: true, price: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page: pageNum, limit: limitNum };
  }

  async updateOrderStatus(userId: string, orderId: string, newStatus: OrderStatus) {
    const profile = await this._getProviderProfile(userId, true);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { meal: true } } },
    });

    if (!order) throw { statusCode: 404, message: "Order not found." };

    const hasItems = order.items.some((item) => item.meal.providerId === profile.id);
    if (!hasItems) throw { statusCode: 403, message: "This order does not belong to your restaurant." };

    const allowedNext = ORDER_TRANSITIONS[order.status];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw {
        statusCode: 400,
        message: `Invalid status transition from ${order.status} to ${newStatus}. Allowed: ${(allowedNext || []).join(", ") || "none"}.`,
      };
    }

    const timestampField: Record<string, string> = {
      PREPARING: "preparingAt",
      READY: "readyAt",
      DELIVERED: "deliveredAt",
      CANCELLED: "cancelledAt",
    };

    const updateData: any = { status: newStatus };
    if (timestampField[newStatus]) updateData[timestampField[newStatus]] = new Date();

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          customer: { select: { name: true, email: true } },
          items: { include: { meal: { select: { title: true } } } },
        },
      }),
      ...(newStatus === "DELIVERED"
        ? [prisma.providerProfile.update({ where: { id: profile.id }, data: { totalOrders: { increment: 1 } } })]
        : []),
    ]);

    return updatedOrder;
  }

  private async _getProviderProfile(userId: string, requireApproved = false) {
    const profile = await prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw { statusCode: 404, message: "Provider profile not found." };
    if (requireApproved && profile.status !== "APPROVED") {
      throw { statusCode: 403, message: "Provider account must be approved before this action can be performed." };
    }
    return profile;
  }
}

export const providerService = new ProviderService();

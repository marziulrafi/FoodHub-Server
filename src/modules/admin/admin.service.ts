import prisma from "../../config/prisma";
import { getPaginationParams } from "../../utils/response";
import { UserStatus } from "@prisma/client";

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalOrders,
      totalMeals,
      totalCategories,
      revenueData,
      recentOrders,
      ordersByStatus,
      topProviders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.order.count(),
      prisma.meal.count(),
      prisma.category.count(),
      prisma.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      prisma.order.findMany({
        include: {
          customer: { select: { name: true, email: true } },
          items: { include: { meal: { select: { name: true } } }, take: 3 },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.order.groupBy({ by: ["status"], _count: true }),
      prisma.providerProfile.findMany({
        orderBy: { rating: "desc" },
        take: 5,
        select: {
          id: true,
          restaurantName: true,
          city: true,
          rating: true,
          totalOrders: true,
          isVerified: true,
          logo: true,
        },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalCustomers,
        totalProviders,
        totalOrders,
        totalMeals,
        totalCategories,
        totalRevenue: revenueData._sum.totalAmount || 0,
      },
      ordersByStatus,
      recentOrders,
      topProviders,
    };
  }

  async getAllUsers(filters: { page?: string; limit?: string; role?: string; status?: string; search?: string }) {
    const { page, limit, role, status, search } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          image: true,
          phone: true,
          createdAt: true,
          providerProfile: { select: { restaurantName: true, city: true, isVerified: true, rating: true } },
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page: pageNum, limit: limitNum };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true,
        createdAt: true,
        providerProfile: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { items: { include: { meal: { select: { name: true } } } } },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!user) throw { statusCode: 404, message: "User not found." };
    return user;
  }

  async updateUserStatus(adminId: string, targetId: string, status: UserStatus) {
    if (adminId === targetId) {
      throw { statusCode: 400, message: "You cannot change your own account status." };
    }

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw { statusCode: 404, message: "User not found." };
    if (user.role === "ADMIN") throw { statusCode: 403, message: "Admin accounts cannot be modified." };

    return prisma.user.update({
      where: { id: targetId },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  }

  async deleteUser(adminId: string, targetId: string) {
    if (adminId === targetId) {
      throw { statusCode: 400, message: "You cannot delete your own account." };
    }

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw { statusCode: 404, message: "User not found." };
    if (user.role === "ADMIN") throw { statusCode: 403, message: "Admin accounts cannot be deleted." };

    await prisma.user.delete({ where: { id: targetId } });
  }

  async getAllOrders(filters: { page?: string; limit?: string; status?: string }) {
    const { page, limit, status } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true } },
          items: {
            include: {
              meal: {
                select: {
                  name: true,
                  provider: { select: { restaurantName: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page: pageNum, limit: limitNum };
  }

  async getAllProviders(filters: { page?: string; limit?: string }) {
    const { page, limit } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        include: {
          user: { select: { name: true, email: true, status: true, createdAt: true } },
          _count: { select: { meals: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.providerProfile.count(),
    ]);

    return { providers, total, page: pageNum, limit: limitNum };
  }

  async toggleProviderVerification(providerId: string) {
    const profile = await prisma.providerProfile.findUnique({ where: { id: providerId } });
    if (!profile) throw { statusCode: 404, message: "Provider not found." };

    return prisma.providerProfile.update({
      where: { id: providerId },
      data: { isVerified: !profile.isVerified },
    });
  }
}

export const adminService = new AdminService();

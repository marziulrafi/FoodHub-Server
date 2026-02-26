import prisma from "../../config/prisma";
import { getPaginationParams } from "../../utils/response";

interface OrderItem {
  mealId: string;
  quantity: number;
}

interface CreateOrderInput {
  items: OrderItem[];
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  note?: string;
}

export class OrderService {
  async create(customerId: string, input: CreateOrderInput) {
    const { items, deliveryAddress, deliveryCity, deliveryPhone, note } = input;

    const mealIds = items.map((i) => i.mealId);
    const meals = await prisma.meal.findMany({ where: { id: { in: mealIds } } });

    if (meals.length !== mealIds.length) {
      const foundIds = meals.map((m) => m.id);
      const missing = mealIds.filter((id) => !foundIds.includes(id));
      throw { statusCode: 404, message: `Meal(s) not found: ${missing.join(", ")}` };
    }

    const unavailable = meals.filter((m) => !m.isAvailable);
    if (unavailable.length > 0) {
      throw {
        statusCode: 400,
        message: `These meals are currently unavailable: ${unavailable.map((m) => m.name).join(", ")}`,
      };
    }

    const orderItems = items.map((item) => {
      const meal = meals.find((m) => m.id === item.mealId)!;
      return {
        mealId: meal.id,
        quantity: item.quantity,
        price: meal.price,
        name: meal.name,
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        customerId,
        totalAmount,
        deliveryAddress,
        deliveryCity,
        deliveryPhone,
        note,
        items: { create: orderItems },
      },
      include: {
        items: { include: { meal: { select: { name: true, image: true, provider: { select: { restaurantName: true } } } } } },
      },
    });

    return order;
  }

  async getCustomerOrders(customerId: string, filters: { page?: string; limit?: string; status?: string }) {
    const { page, limit, status } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const where: any = { customerId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              meal: { select: { name: true, image: true, price: true, provider: { select: { restaurantName: true, logo: true } } } },
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

  async getOrderById(orderId: string, requesterId: string, requesterRole: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        items: {
          include: {
            meal: {
              select: {
                name: true,
                image: true,
                price: true,
                provider: { select: { id: true, restaurantName: true } },
              },
            },
          },
        },
      },
    });

    if (!order) throw { statusCode: 404, message: "Order not found." };

    if (order.customerId !== requesterId && requesterRole !== "ADMIN") {
      throw { statusCode: 403, message: "You are not authorized to view this order." };
    }

    return order;
  }

  async cancelOrder(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw { statusCode: 404, message: "Order not found." };
    if (order.customerId !== customerId) throw { statusCode: 403, message: "You cannot cancel someone else's order." };

    if (order.status !== "PLACED") {
      throw {
        statusCode: 400,
        message: `Order cannot be cancelled in ${order.status} status. Only PLACED orders can be cancelled.`,
      };
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  }
}

export const orderService = new OrderService();

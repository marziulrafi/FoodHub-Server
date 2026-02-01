import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createOrderSchema = z.object({
    items: z.array(
        z.object({
            mealId: z.number().int().positive(),
            quantity: z.number().int().positive(),
        })
    ),
    deliveryAddress: z.string().min(5),
});

export async function createOrder(customerId: number, data: unknown) {
    const { items, deliveryAddress } = createOrderSchema.parse(data);

    const mealIds = items.map(i => i.mealId);
    const meals = await prisma.meal.findMany({
        where: { id: { in: mealIds }, isAvailable: true },
        include: { provider: true },
    });

    if (meals.length !== mealIds.length) throw new Error('Some meals not found or unavailable');

    const totalPrice = items.reduce((sum, item) => {
        const meal = meals.find(m => m.id === item.mealId)!;
        return sum + meal.price * item.quantity;
    }, 0);

    const providerId = meals[0].providerId; 

    return prisma.order.create({
        data: {
            customerId,
            providerId,
            totalPrice,
            deliveryAddress,
            items: {
                create: items.map(item => ({
                    mealId: item.mealId,
                    quantity: item.quantity,
                    priceAtOrder: meals.find(m => m.id === item.mealId)!.price,
                })),
            },
        },
        include: { items: { include: { meal: true } } },
    });
}

export async function getCustomerOrders(customerId: number) {
    return prisma.order.findMany({
        where: { customerId },
        include: {
            items: { include: { meal: true } },
            provider: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getProviderOrders(providerId: number) {
    return prisma.order.findMany({
        where: { providerId },
        include: {
            items: { include: { meal: true } },
            customer: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function updateOrderStatus(orderId: number, providerId: number, status: string) {
    const validStatuses = ['PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) throw new Error('Order not found');
    if (order.providerId !== providerId) throw new Error('Not your order');
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
        throw new Error('Cannot change final status');
    }

    return prisma.order.update({
        where: { id: orderId },
        data: { status },
    });
}
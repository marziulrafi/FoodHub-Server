import { Request, Response } from 'express';
import * as orderService from '../services/order.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export async function createOrder(req: AuthRequest, res: Response) {
    if (req.user!.role !== 'CUSTOMER') return res.status(403).json({ error: 'Only customers can order' });

    try {
        const order = await orderService.createOrder(req.user!.id, req.body);
        res.status(201).json(order);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function getMyOrders(req: AuthRequest, res: Response) {
    try {
        let orders;
        if (req.user!.role === 'CUSTOMER') {
            orders = await orderService.getCustomerOrders(req.user!.id);
        } else if (req.user!.role === 'PROVIDER') {
            orders = await orderService.getProviderOrders(req.user!.id);
        } else {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(orders);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateOrderStatus(req: AuthRequest, res: Response) {
    if (req.user!.role !== 'PROVIDER') return res.status(403).json({ error: 'Only providers' });

    try {
        const { status } = req.body;
        const order = await orderService.updateOrderStatus(
            Number(req.params.id),
            req.user!.id,
            status
        );
        res.json(order);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}
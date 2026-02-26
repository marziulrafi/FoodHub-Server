import { Response } from "express";
import { orderService } from "./orders.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";

export class OrderController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await orderService.create(req.user!.id, req.body);
      sendSuccess(res, "Order placed successfully.", order, 201);
    } catch (err: any) {
      sendError(res, err.message || "Failed to place order.", err.statusCode || 500);
    }
  }

  async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orders, total, page, limit } = await orderService.getCustomerOrders(req.user!.id, req.query as any);
      sendSuccess(res, "Orders fetched successfully.", orders, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch orders.", err.statusCode || 500);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await orderService.getOrderById(req.params.id, req.user!.id, req.user!.role);
      sendSuccess(res, "Order fetched successfully.", order);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch order.", err.statusCode || 500);
    }
  }

  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await orderService.cancelOrder(req.params.id, req.user!.id);
      sendSuccess(res, "Order cancelled successfully.", order);
    } catch (err: any) {
      sendError(res, err.message || "Failed to cancel order.", err.statusCode || 500);
    }
  }
}

export const orderController = new OrderController();

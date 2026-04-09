import { Request, Response } from "express";
import { providerService } from "./providers.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";
import { OrderStatus } from "@prisma/client";

export class ProviderController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { providers, total, page, limit } = await providerService.getAll(req.query as any);
      sendSuccess(res, "Providers fetched successfully.", providers, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch providers.", err.statusCode || 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const provider = await providerService.getById(id);
      sendSuccess(res, "Provider fetched successfully.", provider);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch provider.", err.statusCode || 500);
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profile = await providerService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, "Provider profile updated successfully.", profile);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update profile.", err.statusCode || 500);
    }
  }

  async getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profile = await providerService.getMyProfile(req.user!.id);
      sendSuccess(res, "Provider profile fetched successfully.", profile);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch provider profile.", err.statusCode || 500);
    }
  }

  async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await providerService.getDashboardStats(req.user!.id);
      sendSuccess(res, "Dashboard stats fetched successfully.", data);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch dashboard stats.", err.statusCode || 500);
    }
  }

  async getOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orders, total, page, limit } = await providerService.getProviderOrders(req.user!.id, req.query as any);
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

  async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      if (!status) {
        sendError(res, "status field is required.", 422);
        return;
      }

      const validStatuses: OrderStatus[] = ["PREPARING", "READY", "DELIVERED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        sendError(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 422);
        return;
      }

      const orderId = req.params.orderId as string;
      const order = await providerService.updateOrderStatus(req.user!.id, orderId, status);
      sendSuccess(res, "Order status updated successfully.", order);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update order status.", err.statusCode || 500);
    }
  }
}

export const providerController = new ProviderController();

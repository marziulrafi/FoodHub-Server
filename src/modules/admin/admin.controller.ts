import { Response } from "express";
import { adminService } from "./admin.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";
import { UserStatus } from "@prisma/client";

export class AdminController {
  async getDashboard(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await adminService.getDashboardStats();
      sendSuccess(res, "Dashboard stats fetched successfully.", data);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch dashboard.", err.statusCode || 500);
    }
  }

  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { users, total, page, limit } = await adminService.getAllUsers(req.query as any);
      sendSuccess(res, "Users fetched successfully.", users, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch users.", err.statusCode || 500);
    }
  }

  async getUserById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await adminService.getUserById(req.params.id);
      sendSuccess(res, "User fetched successfully.", user);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch user.", err.statusCode || 500);
    }
  }

  async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const validStatuses: UserStatus[] = ["ACTIVE", "SUSPENDED"];
      if (!validStatuses.includes(status)) {
        sendError(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 422);
        return;
      }
      const user = await adminService.updateUserStatus(req.user!.id, req.params.id, status);
      sendSuccess(res, `User ${status === "SUSPENDED" ? "suspended" : "activated"} successfully.`, user);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update user status.", err.statusCode || 500);
    }
  }

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      await adminService.deleteUser(req.user!.id, req.params.id);
      sendSuccess(res, "User deleted successfully.");
    } catch (err: any) {
      sendError(res, err.message || "Failed to delete user.", err.statusCode || 500);
    }
  }

  async getOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orders, total, page, limit } = await adminService.getAllOrders(req.query as any);
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

  async getProviders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { providers, total, page, limit } = await adminService.getAllProviders(req.query as any);
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

  async toggleProviderVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profile = await adminService.toggleProviderVerification(req.params.id);
      sendSuccess(res, `Provider ${profile.isVerified ? "verified" : "unverified"} successfully.`, profile);
    } catch (err: any) {
      sendError(res, err.message || "Failed to toggle verification.", err.statusCode || 500);
    }
  }
}

export const adminController = new AdminController();

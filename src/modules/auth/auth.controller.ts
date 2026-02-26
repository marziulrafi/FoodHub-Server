import { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.register(req.body);
      sendSuccess(res, "Registration successful! Please login.", { user }, 201);
    } catch (err: any) {
      sendError(res, err.message || "Registration failed.", err.statusCode || 500);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, token, setCookie } = await authService.login(email, password, req.headers);

      if (setCookie) res.setHeader("Set-Cookie", setCookie);

      sendSuccess(res, "Login successful.", { user, token });
    } catch (err: any) {
      sendError(res, err.message || "Login failed.", err.statusCode || 500);
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      await authService.logout(req.headers);
      res.clearCookie("better-auth.session_token");
      sendSuccess(res, "Logged out successfully.");
    } catch (err: any) {
      sendError(res, err.message || "Logout failed.", err.statusCode || 500);
    }
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);
      sendSuccess(res, "User fetched successfully.", user);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch user.", err.statusCode || 500);
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, "Profile updated successfully.", user);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update profile.", err.statusCode || 500);
    }
  }
}

export const authController = new AuthController();

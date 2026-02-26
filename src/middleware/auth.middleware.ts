import { Response, NextFunction } from "express";
import { auth } from "../config/auth";
import prisma from "../config/prisma";
import { AuthRequest } from "../types";
import { sendError } from "../utils/response";
import { Role } from "@prisma/client";
import { toNodeHandler } from "better-auth/node";

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session || !session.user) {
      sendError(res, "Unauthorized. Please login.", 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true,
      },
    });

    if (!user) {
      sendError(res, "User not found.", 401);
      return;
    }

    if (user.status === "SUSPENDED") {
      sendError(res, "Your account has been suspended. Contact support.", 403);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    sendError(res, "Authentication failed.", 401);
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Unauthorized.", 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, "Forbidden. Insufficient permissions.", 403);
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole("ADMIN");
export const requireProvider = requireRole("PROVIDER", "ADMIN");
export const requireCustomer = requireRole("CUSTOMER", "ADMIN");

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, role: true, status: true, image: true, phone: true, address: true },
      });
      if (user && user.status === "ACTIVE") req.user = user;
    }
  } catch {
  }
  next();
};

export const betterAuthHandler = toNodeHandler(auth);

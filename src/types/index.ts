import { Request } from "express";
import { Role, UserStatus } from "@prisma/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  image?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export type PaginationQuery = {
  page?: string;
  limit?: string;
};

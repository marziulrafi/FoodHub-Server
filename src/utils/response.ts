import { Response } from "express";
import { ApiResponse } from "../types";

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: ApiResponse["meta"]
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  } as ApiResponse<T>);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  } as ApiResponse);
};

export const getPaginationParams = (page?: string, limit?: string) => {
  const pageNum = Math.max(1, parseInt(page || "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "10", 10)));
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
};

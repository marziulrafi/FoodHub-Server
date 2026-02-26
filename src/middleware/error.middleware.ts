import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.method} ${req.path} not found.`, 404);
};

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Global Error:", err);

  if (err instanceof ZodError) {
    sendError(
      res,
      "Validation failed.",
      422,
      err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    );
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, "A record with this value already exists.", 409);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "Record not found.", 404);
      return;
    }
    sendError(res, "Database error.", 500, err.message);
    return;
  }

  sendError(
    res,
    process.env.NODE_ENV === "production" ? "Internal server error." : err.message,
    500
  );
};

export const asyncHandler = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

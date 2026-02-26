import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response";

export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = (result.error as ZodError).errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      sendError(res, "Validation failed.", 422, errors);
      return;
    }
    req[source] = result.data;
    next();
  };

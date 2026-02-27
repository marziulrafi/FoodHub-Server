import { Request, Response } from "express";
import { reviewService } from "./reviews.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";

export class ReviewController {
  async getByMeal(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query as Record<string, string>;
      const data = await reviewService.getByMeal(req.params.mealId, page, limit);
      sendSuccess(res, "Reviews fetched successfully.", data.reviews, 200, {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(data.total / data.limit),
      });
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch reviews.", err.statusCode || 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user!.role !== "CUSTOMER") {
        sendError(res, "Only customers can submit reviews.", 403);
        return;
      }
      const review = await reviewService.create(req.user!.id, req.body);
      sendSuccess(res, "Review submitted successfully.", review, 201);
    } catch (err: any) {
      sendError(res, err.message || "Failed to submit review.", err.statusCode || 500);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const review = await reviewService.update(req.user!.id, req.params.id, req.body);
      sendSuccess(res, "Review updated successfully.", review);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update review.", err.statusCode || 500);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await reviewService.delete(req.user!.id, req.user!.role, req.params.id);
      sendSuccess(res, "Review deleted successfully.");
    } catch (err: any) {
      sendError(res, err.message || "Failed to delete review.", err.statusCode || 500);
    }
  }
}

export const reviewController = new ReviewController();

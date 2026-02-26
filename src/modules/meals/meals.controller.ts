import { Request, Response } from "express";
import { mealService } from "./meals.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";

export class MealController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { meals, total, page, limit } = await mealService.getAll(req.query as any);
      sendSuccess(res, "Meals fetched successfully.", meals, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch meals.", err.statusCode || 500);
    }
  }

  async getFeatured(_req: Request, res: Response): Promise<void> {
    try {
      const meals = await mealService.getFeatured();
      sendSuccess(res, "Featured meals fetched successfully.", meals);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch featured meals.", err.statusCode || 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const meal = await mealService.getById(req.params.id);
      sendSuccess(res, "Meal fetched successfully.", meal);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch meal.", err.statusCode || 500);
    }
  }

  async getProviderMeals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query as Record<string, string>;
      const { meals, total, page: pageNum, limit: limitNum } = await mealService.getProviderMeals(req.user!.id, page, limit);
      sendSuccess(res, "Provider meals fetched successfully.", meals, 200, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch provider meals.", err.statusCode || 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meal = await mealService.create(req.user!.id, req.body);
      sendSuccess(res, "Meal added successfully.", meal, 201);
    } catch (err: any) {
      sendError(res, err.message || "Failed to create meal.", err.statusCode || 500);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meal = await mealService.update(req.user!.id, req.params.id, req.body);
      sendSuccess(res, "Meal updated successfully.", meal);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update meal.", err.statusCode || 500);
    }
  }

  async toggleAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meal = await mealService.toggleAvailability(req.user!.id, req.params.id);
      sendSuccess(res, `Meal is now ${meal.isAvailable ? "available" : "unavailable"}.`, meal);
    } catch (err: any) {
      sendError(res, err.message || "Failed to toggle meal.", err.statusCode || 500);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await mealService.delete(req.user!.id, req.params.id);
      sendSuccess(res, "Meal deleted successfully.");
    } catch (err: any) {
      sendError(res, err.message || "Failed to delete meal.", err.statusCode || 500);
    }
  }
}

export const mealController = new MealController();

import { Request, Response } from "express";
import { categoryService } from "./categories.service";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../types";

export class CategoryController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const isAdmin = req.user?.role === "ADMIN";
      const categories = isAdmin
        ? await categoryService.getAllForAdmin()
        : await categoryService.getAll();
      sendSuccess(res, "Categories fetched successfully.", categories);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch categories.", err.statusCode || 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const category = await categoryService.getById(req.params.id);
      sendSuccess(res, "Category fetched successfully.", category);
    } catch (err: any) {
      sendError(res, err.message || "Failed to fetch category.", err.statusCode || 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const category = await categoryService.create(req.body);
      sendSuccess(res, "Category created successfully.", category, 201);
    } catch (err: any) {
      sendError(res, err.message || "Failed to create category.", err.statusCode || 500);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      sendSuccess(res, "Category updated successfully.", category);
    } catch (err: any) {
      sendError(res, err.message || "Failed to update category.", err.statusCode || 500);
    }
  }

  async toggleActive(req: AuthRequest, res: Response): Promise<void> {
    try {
      const category = await categoryService.toggleActive(req.params.id);
      sendSuccess(res, `Category ${category.isActive ? "activated" : "deactivated"} successfully.`, category);
    } catch (err: any) {
      sendError(res, err.message || "Failed to toggle category.", err.statusCode || 500);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await categoryService.delete(req.params.id);
      sendSuccess(res, "Category deleted successfully.");
    } catch (err: any) {
      sendError(res, err.message || "Failed to delete category.", err.statusCode || 500);
    }
  }
}

export const categoryController = new CategoryController();

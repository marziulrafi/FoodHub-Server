import { Router } from "express";
import { z } from "zod";
import { reviewController } from "./reviews.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();

const createReviewSchema = z.object({
  mealId: z.string().min(1, "mealId is required"),
  rating: z.number().int().min(1, "Min rating is 1").max(5, "Max rating is 5"),
  comment: z.string().max(500, "Comment cannot exceed 500 characters").optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

router.get("/meal/:mealId", (req, res) => reviewController.getByMeal(req, res));
router.post("/", requireAuth, validate(createReviewSchema), (req, res) => reviewController.create(req as any, res));
router.put("/:id", requireAuth, validate(updateReviewSchema), (req, res) => reviewController.update(req as any, res));
router.delete("/:id", requireAuth, (req, res) => reviewController.delete(req as any, res));

export default router;

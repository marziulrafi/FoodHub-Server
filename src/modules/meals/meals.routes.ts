import { Router } from "express";
import { z } from "zod";
import { mealController } from "./meals.controller";
import { requireAuth, requireProvider } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();

const mealSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  image: z.string().url("Must be a valid URL").optional(),
  images: z.array(z.string().url()).optional(),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  spiceLevel: z.enum(["MILD", "MEDIUM", "HOT", "EXTRA_HOT"]).optional(),
  prepTime: z.number().int().positive().optional(),
  calories: z.number().int().positive().optional(),
});

// Public routes
router.get("/", (req, res) => mealController.getAll(req, res));
router.get("/featured", (req, res) => mealController.getFeatured(req, res));

// Provider routes (must come before /:id to avoid conflict)
router.get("/provider/mine", requireAuth, requireProvider, (req, res) => mealController.getProviderMeals(req as any, res));
router.post("/provider", requireAuth, requireProvider, validate(mealSchema), (req, res) => mealController.create(req as any, res));
router.put("/provider/:id", requireAuth, requireProvider, validate(mealSchema.partial()), (req, res) => mealController.update(req as any, res));
router.patch("/provider/:id/toggle", requireAuth, requireProvider, (req, res) => mealController.toggleAvailability(req as any, res));
router.delete("/provider/:id", requireAuth, requireProvider, (req, res) => mealController.delete(req as any, res));

// Public single meal (last to avoid route conflicts)
router.get("/:id", (req, res) => mealController.getById(req, res));

export default router;

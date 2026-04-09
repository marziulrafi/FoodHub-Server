import { Router } from "express";
import { z } from "zod";
import { mealController } from "./meals.controller";
import { requireAuth, requireProvider } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router() as any;

const mealSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be positive"),
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

router.get("/", (req: any, res: any) => mealController.getAll(req, res));
router.get(
  "/featured",
  (req: any, res: any) => mealController.getFeatured(req, res)
);

router.get(
  "/provider/mine",
  requireAuth,
  requireProvider,
  (req: any, res: any) => mealController.getProviderMeals(req as any, res)
);
router.post(
  "/provider",
  requireAuth,
  requireProvider,
  validate(mealSchema),
  (req: any, res: any) => mealController.create(req as any, res)
);
router.put(
  "/provider/:id",
  requireAuth,
  requireProvider,
  validate(mealSchema.partial()),
  (req: any, res: any) => mealController.update(req as any, res)
);
router.patch(
  "/provider/:id/toggle",
  requireAuth,
  requireProvider,
  (req: any, res: any) =>
    mealController.toggleAvailability(req as any, res)
);
router.delete(
  "/provider/:id",
  requireAuth,
  requireProvider,
  (req: any, res: any) => mealController.delete(req as any, res)
);

router.get("/:id", (req: any, res: any) => mealController.getById(req, res));

export default router;

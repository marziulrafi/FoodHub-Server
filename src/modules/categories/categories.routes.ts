import { Router } from "express";
import { z } from "zod";
import { categoryController } from "./categories.controller";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { optionalAuth } from "../../middleware/auth.middleware";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  image: z.string().url("Must be a valid URL").optional(),
});

router.get("/", optionalAuth, (req, res) => categoryController.getAll(req as any, res));
router.get("/:id", (req, res) => categoryController.getById(req, res));
router.post("/", requireAuth, requireAdmin, validate(categorySchema), (req, res) => categoryController.create(req as any, res));
router.put("/:id", requireAuth, requireAdmin, validate(categorySchema.partial()), (req, res) => categoryController.update(req as any, res));
router.patch("/:id/toggle", requireAuth, requireAdmin, (req, res) => categoryController.toggleActive(req as any, res));
router.delete("/:id", requireAuth, requireAdmin, (req, res) => categoryController.delete(req as any, res));

export default router;

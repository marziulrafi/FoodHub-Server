import { Router } from "express";
import { z } from "zod";
import { categoryController } from "../categories/categories.controller";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router() as any;

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  image: z.string().url("Must be a valid URL").optional(),
});

router.use(requireAuth, requireAdmin);

router.get("/", (req: any, res: any) => categoryController.getAll(req as any, res));
router.get("/:id", (req: any, res: any) => categoryController.getById(req as any, res));

router.post("/", validate(categorySchema), (req: any, res: any) =>
  categoryController.create(req as any, res)
);

router.put("/:id", validate(categorySchema.partial()), (req: any, res: any) =>
  categoryController.update(req as any, res)
);

router.patch("/:id/toggle", (req: any, res: any) =>
  categoryController.toggleActive(req as any, res)
);

router.delete("/:id", (req: any, res: any) => categoryController.delete(req as any, res));

export default router;


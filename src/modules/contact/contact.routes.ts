import { Router } from "express";
import { z } from "zod";
import { contactController } from "./contact.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware";

const router = Router() as any;

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(7, "Phone must be at least 7 characters").optional(),
  subject: z.string().min(3, "Subject must be at least 3 characters").optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

router.post("/", validate(contactSchema), (req: any, res: any) => contactController.create(req, res));
router.get("/", requireAuth, requireAdmin, (req: any, res: any) => contactController.getAll(req, res));

export default router;

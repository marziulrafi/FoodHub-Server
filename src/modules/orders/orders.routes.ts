import { Router } from "express";
import { z } from "zod";
import { orderController } from "./orders.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        mealId: z.string().min(1, "mealId is required"),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
      })
    )
    .min(1, "Order must have at least one item"),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  deliveryCity: z.string().min(2, "Delivery city is required"),
  deliveryPhone: z.string().min(7, "Delivery phone is required"),
  note: z.string().max(300).optional(),
});

router.post("/", requireAuth, validate(createOrderSchema), (req, res) => orderController.create(req as any, res));
router.get("/", requireAuth, (req, res) => orderController.getMyOrders(req as any, res));
router.get("/:id", requireAuth, (req, res) => orderController.getById(req as any, res));
router.patch("/:id/cancel", requireAuth, (req, res) => orderController.cancel(req as any, res));

export default router;

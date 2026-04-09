import { Router } from "express";
import { z } from "zod";
import { orderController } from "./orders.controller";
import { requireAuth, requireCustomer } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router() as any;

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        mealId: z.string().min(1, "mealId is required"),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
      })
    )
    .min(1, "Order must have at least one item"),
  address: z.string().min(5, "Address is required"),
  note: z.string().max(300).optional(),
});

router.post(
  "/",
  requireAuth,
  requireCustomer,
  validate(createOrderSchema),
  (req: any, res: any) => orderController.create(req as any, res)
);
router.get("/", requireAuth, requireCustomer, (req: any, res: any) =>
  orderController.getMyOrders(req as any, res)
);
router.get("/:id", requireAuth, requireCustomer, (req: any, res: any) =>
  orderController.getById(req as any, res)
);
router.patch("/:id/cancel", requireAuth, requireCustomer, (req: any, res: any) =>
  orderController.cancel(req as any, res)
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { providerController } from "./providers.controller";
import { requireAuth, requireProvider } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router() as any;

const updateProviderSchema = z.object({
  restaurantName: z.string().min(2).optional(),
  description: z.string().optional(),
  logo: z.string().url("Must be a valid URL").optional(),
  banner: z.string().url("Must be a valid URL").optional(),
  cuisineTypes: z.array(z.string()).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

router.get("/", (req: any, res: any) => providerController.getAll(req, res));

router.get(
  "/dashboard/stats",
  requireAuth,
  requireProvider,
  (req: any, res: any) => providerController.getDashboardStats(req as any, res)
);
router.get(
  "/orders/mine",
  requireAuth,
  requireProvider,
  (req: any, res: any) => providerController.getOrders(req as any, res)
);
router.patch(
  "/orders/:orderId/status",
  requireAuth,
  requireProvider,
  (req: any, res: any) => providerController.updateOrderStatus(req as any, res)
);

router.get(
  "/profile/me",
  requireAuth,
  requireProvider,
  (req: any, res: any) => providerController.getMyProfile(req as any, res)
);

router.patch(
  "/profile/me",
  requireAuth,
  requireProvider,
  validate(updateProviderSchema),
  (req: any, res: any) => providerController.updateProfile(req as any, res)
);

router.get("/:id", (req: any, res: any) => providerController.getById(req, res));

export default router;

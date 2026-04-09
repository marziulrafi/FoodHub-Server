import { Router } from "express";
import { adminController } from "./admin.controller";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware";

const router = Router() as any;

router.use(requireAuth, requireAdmin);

router.get("/dashboard", (req: any, res: any) => adminController.getDashboard(req as any, res));

router.get("/users", (req: any, res: any) => adminController.getUsers(req as any, res));
router.get("/users/:id", (req: any, res: any) => adminController.getUserById(req as any, res));
router.patch("/users/:id", (req: any, res: any) => adminController.updateUserStatus(req as any, res));
router.patch("/users/:id/status", (req: any, res: any) => adminController.updateUserStatus(req as any, res));
router.delete("/users/:id", (req: any, res: any) => adminController.deleteUser(req as any, res));

router.get("/orders", (req: any, res: any) => adminController.getOrders(req as any, res));

router.get("/providers", (req: any, res: any) => adminController.getProviders(req as any, res));
router.get("/providers/pending", (req: any, res: any) => adminController.getPendingProviders(req as any, res));
router.patch("/providers/:id/approve", (req: any, res: any) => adminController.approveProvider(req as any, res));
router.patch("/providers/:id/reject", (req: any, res: any) => adminController.rejectProvider(req as any, res));
router.patch("/providers/:id/verify", (req: any, res: any) => adminController.toggleProviderVerification(req as any, res));

export default router;

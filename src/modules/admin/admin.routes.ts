import { Router } from "express";
import { adminController } from "./admin.controller";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/dashboard", (req, res) => adminController.getDashboard(req as any, res));

router.get("/users", (req, res) => adminController.getUsers(req as any, res));
router.get("/users/:id", (req, res) => adminController.getUserById(req as any, res));
router.patch("/users/:id/status", (req, res) => adminController.updateUserStatus(req as any, res));
router.delete("/users/:id", (req, res) => adminController.deleteUser(req as any, res));

router.get("/orders", (req, res) => adminController.getOrders(req as any, res));

router.get("/providers", (req, res) => adminController.getProviders(req as any, res));
router.patch("/providers/:id/verify", (req, res) => adminController.toggleProviderVerification(req as any, res));

export default router;

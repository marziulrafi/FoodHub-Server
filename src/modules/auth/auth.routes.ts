import { Router } from "express";
import { z } from "zod";
import { authController } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  restaurantName: z.string().min(2).optional(),
  restaurantAddress: z.string().min(5).optional(),
  restaurantCity: z.string().min(2).optional(),
  restaurantPhone: z.string().min(7).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  image: z.string().url("Must be a valid URL").optional(),
});

router.post("/register", validate(registerSchema), (req, res) => authController.register(req, res));
router.post("/login", validate(loginSchema), (req, res) => authController.login(req, res));
router.post("/logout", requireAuth, (req, res) => authController.logout(req as any, res));
router.get("/me", requireAuth, (req, res) => authController.getMe(req as any, res));
router.patch("/me", requireAuth, validate(updateProfileSchema), (req, res) => authController.updateProfile(req as any, res));

export default router;

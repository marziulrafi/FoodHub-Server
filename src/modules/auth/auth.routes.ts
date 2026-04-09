import { Router } from "express";
import { z } from "zod";
import { authController } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router() as any;

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  z.string().url("Must be a valid URL").optional()
);

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  restaurantName: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  restaurantAddress: z.string().min(5).optional(),
  phone: z.string().min(7).optional(),
  restaurantPhone: z.string().min(7).optional(),
  city: z.string().optional(),
  restaurantCity: z.string().optional(),
  description: z.string().optional(),
  logo: optionalUrl,
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

router.post("/register", validate(registerSchema), (req: any, res: any) => authController.register(req, res));
router.post("/login", validate(loginSchema), (req: any, res: any) => authController.login(req, res));
router.post("/logout", requireAuth, (req: any, res: any) => authController.logout(req as any, res));
router.get("/me", requireAuth, (req: any, res: any) => authController.getMe(req as any, res));
router.patch("/me", requireAuth, validate(updateProfileSchema), (req: any, res: any) => authController.updateProfile(req as any, res));

export default router;

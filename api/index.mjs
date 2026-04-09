// src/app.ts
import express from "express";
import cors from "cors";
import { toNodeHandler as toNodeHandler2 } from "better-auth/node";

// src/config/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// src/config/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
var globalForPrisma = globalThis;
var adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});
var prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
var prisma_default = prisma;

// src/config/auth.ts
var normalizeOrigin = (url) => url?.replace(/\/+$/, "") || "";
var frontendUrl = normalizeOrigin(process.env.FRONTEND_URL) || "http://localhost:3000";
var defaultFrontendUrls = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://foodhub-server-seven.vercel.app",
  "https://foodhub-seven-navy.vercel.app"
].map(normalizeOrigin);
var auth = betterAuth({
  database: prismaAdapter(prisma_default, {
    provider: "postgresql"
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-in-production",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
        input: true
      },
      phone: {
        type: "string",
        required: false,
        input: true
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
    }
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production"
  },
  defaultCookieAttributes: {
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production"
  },
  trustedOrigins: Array.from(/* @__PURE__ */ new Set([frontendUrl, ...defaultFrontendUrls]))
});
if (process.env.NODE_ENV === "production") {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("Missing BETTER_AUTH_SECRET in production environment.");
  }
  if (!process.env.BETTER_AUTH_URL) {
    throw new Error("Missing BETTER_AUTH_URL in production environment.");
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error("Missing FRONTEND_URL in production environment.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in production environment.");
  }
}

// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { z } from "zod";

// src/modules/auth/auth.service.ts
var AuthService = class {
  async register(input) {
    const {
      name,
      email,
      password,
      role,
      restaurantName,
      address,
      restaurantAddress,
      phone,
      restaurantPhone,
      city,
      restaurantCity,
      description,
      logo
    } = input;
    const existingUser = await prisma_default.user.findUnique({ where: { email } });
    if (existingUser) {
      throw { statusCode: 409, message: "Email already registered." };
    }
    if (role === "PROVIDER") {
      const resolvedAddress = address ?? restaurantAddress;
      const resolvedPhone = phone ?? restaurantPhone;
      if (!restaurantName || !resolvedAddress || !resolvedPhone) {
        throw {
          statusCode: 422,
          message: "Provider registration requires: restaurantName, address, phone."
        };
      }
    }
    const authResult = await auth.api.signUpEmail({
      body: { name, email, password }
    });
    if (!authResult?.user) {
      throw { statusCode: 500, message: "Registration failed. Please try again." };
    }
    const user = await prisma_default.user.update({
      where: { id: authResult.user.id },
      data: {
        role: role ?? "CUSTOMER",
        emailVerified: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    });
    if (role === "PROVIDER") {
      const resolvedAddress = address ?? restaurantAddress;
      const resolvedPhone = phone ?? restaurantPhone;
      const resolvedCity = city ?? restaurantCity;
      const providerProfileData = {
        userId: user.id,
        restaurantName,
        address: resolvedAddress,
        phone: resolvedPhone,
        cuisineTypes: [],
        status: "PENDING",
        isVerified: false
      };
      if (description) providerProfileData.description = description;
      if (logo) providerProfileData.logo = logo;
      if (resolvedCity) providerProfileData.city = resolvedCity;
      await prisma_default.providerProfile.create({ data: providerProfileData });
    }
    return user;
  }
  async login(email, password, headers) {
    if (!email || !password) {
      throw { statusCode: 422, message: "Email and password are required." };
    }
    const result = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true
    });
    if (!result.ok) {
      const body2 = await result.json().catch(() => ({}));
      throw {
        statusCode: 401,
        message: body2?.message || "Invalid credentials."
      };
    }
    const body = await result.json();
    const setCookie = result.headers.get("set-cookie");
    const user = await prisma_default.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true
      }
    });
    if (!user) throw { statusCode: 401, message: "User not found." };
    if (user.status === "SUSPENDED") {
      throw {
        statusCode: 403,
        message: "Your account has been suspended. Contact support."
      };
    }
    return { user, token: body?.token, setCookie };
  }
  async logout(headers) {
    await auth.api.signOut({ headers, asResponse: false });
  }
  async getMe(userId) {
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true,
        createdAt: true,
        providerProfile: {
          select: {
            id: true,
            restaurantName: true,
            description: true,
            logo: true,
            banner: true,
            cuisineTypes: true,
            address: true,
            city: true,
            phone: true,
            isVerified: true,
            rating: true,
            totalOrders: true
          }
        }
      }
    });
    if (!user) throw { statusCode: 404, message: "User not found." };
    return user;
  }
  async updateProfile(userId, data) {
    const user = await prisma_default.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true
      }
    });
    return user;
  }
};
var authService = new AuthService();

// src/utils/response.ts
var sendSuccess = (res, message, data, statusCode = 200, meta) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
};
var sendError = (res, message, statusCode = 400, error) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error
  });
};
var getPaginationParams = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page || "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "10", 10)));
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
};
var sendResponse = (res, statusCode, message, data, meta) => sendSuccess(res, message, data, statusCode, meta);

// src/modules/auth/auth.controller.ts
var AuthController = class {
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      sendSuccess(res, "Registration successful! Please login.", { user }, 201);
    } catch (err) {
      sendError(res, err.message || "Registration failed.", err.statusCode || 500);
    }
  }
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const { user, token, setCookie } = await authService.login(email, password, req.headers);
      if (setCookie) res.setHeader("Set-Cookie", setCookie);
      sendSuccess(res, "Login successful.", { user, token });
    } catch (err) {
      sendError(res, err.message || "Login failed.", err.statusCode || 500);
    }
  }
  async logout(req, res) {
    try {
      await authService.logout(req.headers);
      res.clearCookie("better-auth.session_token");
      sendSuccess(res, "Logged out successfully.");
    } catch (err) {
      sendError(res, err.message || "Logout failed.", err.statusCode || 500);
    }
  }
  async getMe(req, res) {
    try {
      const user = await authService.getMe(req.user.id);
      sendSuccess(res, "User fetched successfully.", user);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch user.", err.statusCode || 500);
    }
  }
  async updateProfile(req, res) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      sendSuccess(res, "Profile updated successfully.", user);
    } catch (err) {
      sendError(res, err.message || "Failed to update profile.", err.statusCode || 500);
    }
  }
};
var authController = new AuthController();

// src/middleware/auth.middleware.ts
import { toNodeHandler } from "better-auth/node";
var requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });
    if (!session || !session.user) {
      sendError(res, "Unauthorized. Please login.", 401);
      return;
    }
    const user = await prisma_default.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true
      }
    });
    if (!user) {
      sendError(res, "User not found.", 401);
      return;
    }
    if (user.status === "SUSPENDED") {
      sendError(res, "Your account has been suspended. Contact support.", 403);
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    sendError(res, "Authentication failed.", 401);
  }
};
var requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, "Unauthorized.", 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, "Forbidden. Insufficient permissions.", 403);
      return;
    }
    next();
  };
};
var requireAdmin = requireRole("ADMIN");
var requireProvider = requireRole("PROVIDER", "ADMIN");
var requireCustomer = requireRole("CUSTOMER", "ADMIN");
var optionalAuth = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      const user = await prisma_default.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, role: true, status: true, image: true, phone: true, address: true }
      });
      if (user && user.status === "ACTIVE") req.user = user;
    }
  } catch {
  }
  next();
};
var betterAuthHandler = toNodeHandler(auth);

// src/middleware/validate.middleware.ts
var validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    sendError(res, "Validation failed.", 422, errors);
    return;
  }
  req[source] = result.data;
  next();
};

// src/modules/auth/auth.routes.ts
var router = Router();
var optionalUrl = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return void 0;
    }
    return value;
  },
  z.string().url("Must be a valid URL").optional()
);
var registerSchema = z.object({
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
  logo: optionalUrl
});
var loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required")
});
var updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  image: z.string().url("Must be a valid URL").optional()
});
router.post("/register", validate(registerSchema), (req, res) => authController.register(req, res));
router.post("/login", validate(loginSchema), (req, res) => authController.login(req, res));
router.post("/logout", requireAuth, (req, res) => authController.logout(req, res));
router.get("/me", requireAuth, (req, res) => authController.getMe(req, res));
router.patch("/me", requireAuth, validate(updateProfileSchema), (req, res) => authController.updateProfile(req, res));
var auth_routes_default = router;

// src/modules/meals/meals.routes.ts
import { Router as Router2 } from "express";
import { z as z2 } from "zod";

// src/modules/meals/meals.service.ts
var MealService = class {
  async getAll(filters) {
    const { page, limit, category, providerId, search, minPrice, maxPrice, isVegetarian, isVegan, isGlutenFree, sortBy = "createdAt", order = "desc" } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = { isAvailable: true };
    if (category) where.categoryId = category;
    if (providerId) where.providerId = providerId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (isVegetarian === "true") where.isVegetarian = true;
    if (isVegan === "true") where.isVegan = true;
    if (isGlutenFree === "true") where.isGlutenFree = true;
    const validSortFields = ["price", "rating", "createdAt", "title"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";
    const [meals, total] = await Promise.all([
      prisma_default.meal.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, restaurantName: true, city: true, rating: true, logo: true } }
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma_default.meal.count({ where })
    ]);
    return { meals, total, page: pageNum, limit: limitNum };
  }
  async getFeatured() {
    return prisma_default.meal.findMany({
      where: { isAvailable: true, rating: { gte: 4 } },
      include: {
        category: { select: { name: true } },
        provider: { select: { restaurantName: true, city: true, logo: true } }
      },
      orderBy: { rating: "desc" },
      take: 8
    });
  }
  async getById(id) {
    const meal = await prisma_default.meal.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          select: {
            id: true,
            restaurantName: true,
            description: true,
            logo: true,
            city: true,
            address: true,
            phone: true,
            rating: true,
            totalOrders: true,
            isVerified: true,
            cuisineTypes: true
          }
        },
        reviews: {
          include: { customer: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 10
        },
        _count: { select: { reviews: true } }
      }
    });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    return meal;
  }
  async getProviderMeals(userId, page, limit) {
    const profile = await this._getProviderProfile(userId);
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const [meals, total] = await Promise.all([
      prisma_default.meal.findMany({
        where: { providerId: profile.id },
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { orderItems: true, reviews: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.meal.count({ where: { providerId: profile.id } })
    ]);
    return { meals, total, page: pageNum, limit: limitNum };
  }
  async create(userId, data) {
    const profile = await this._getProviderProfile(userId, true);
    const category = await prisma_default.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw { statusCode: 404, message: "Category not found." };
    if (!category.isActive) throw { statusCode: 400, message: "Selected category is inactive." };
    return prisma_default.meal.create({
      data: { ...data, providerId: profile.id },
      include: {
        category: { select: { name: true } },
        provider: { select: { restaurantName: true } }
      }
    });
  }
  async update(userId, mealId, data) {
    const profile = await this._getProviderProfile(userId, true);
    const meal = await prisma_default.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    if (meal.providerId !== profile.id) throw { statusCode: 403, message: "You do not own this meal." };
    if (data.categoryId) {
      const category = await prisma_default.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw { statusCode: 404, message: "Category not found." };
    }
    return prisma_default.meal.update({
      where: { id: mealId },
      data,
      include: { category: { select: { name: true } } }
    });
  }
  async toggleAvailability(userId, mealId) {
    const profile = await this._getProviderProfile(userId, true);
    const meal = await prisma_default.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    if (meal.providerId !== profile.id) throw { statusCode: 403, message: "You do not own this meal." };
    return prisma_default.meal.update({
      where: { id: mealId },
      data: { isAvailable: !meal.isAvailable }
    });
  }
  async delete(userId, mealId) {
    const profile = await this._getProviderProfile(userId, true);
    const meal = await prisma_default.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    if (meal.providerId !== profile.id) throw { statusCode: 403, message: "You do not own this meal." };
    await prisma_default.meal.delete({ where: { id: mealId } });
  }
  async _getProviderProfile(userId, requireApproved = false) {
    const profile = await prisma_default.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw { statusCode: 404, message: "Provider profile not found. Please complete your profile." };
    if (requireApproved && profile.status !== "APPROVED") {
      throw { statusCode: 403, message: "Provider account must be approved before this action can be performed." };
    }
    return profile;
  }
};
var mealService = new MealService();

// src/modules/meals/meals.controller.ts
var MealController = class {
  async getAll(req, res) {
    try {
      const { meals, total, page, limit } = await mealService.getAll(req.query);
      sendSuccess(res, "Meals fetched successfully.", meals, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch meals.", err.statusCode || 500);
    }
  }
  async getFeatured(_req, res) {
    try {
      const meals = await mealService.getFeatured();
      sendSuccess(res, "Featured meals fetched successfully.", meals);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch featured meals.", err.statusCode || 500);
    }
  }
  async getById(req, res) {
    try {
      const id = req.params.id;
      const meal = await mealService.getById(id);
      sendSuccess(res, "Meal fetched successfully.", meal);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch meal.", err.statusCode || 500);
    }
  }
  async getProviderMeals(req, res) {
    try {
      const { page, limit } = req.query;
      const { meals, total, page: pageNum, limit: limitNum } = await mealService.getProviderMeals(req.user.id, page, limit);
      sendSuccess(res, "Provider meals fetched successfully.", meals, 200, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch provider meals.", err.statusCode || 500);
    }
  }
  async create(req, res) {
    try {
      const meal = await mealService.create(req.user.id, req.body);
      sendSuccess(res, "Meal added successfully.", meal, 201);
    } catch (err) {
      sendError(res, err.message || "Failed to create meal.", err.statusCode || 500);
    }
  }
  async update(req, res) {
    try {
      const id = req.params.id;
      const meal = await mealService.update(req.user.id, id, req.body);
      sendSuccess(res, "Meal updated successfully.", meal);
    } catch (err) {
      sendError(res, err.message || "Failed to update meal.", err.statusCode || 500);
    }
  }
  async toggleAvailability(req, res) {
    try {
      const id = req.params.id;
      const meal = await mealService.toggleAvailability(req.user.id, id);
      sendSuccess(res, `Meal is now ${meal.isAvailable ? "available" : "unavailable"}.`, meal);
    } catch (err) {
      sendError(res, err.message || "Failed to toggle meal.", err.statusCode || 500);
    }
  }
  async delete(req, res) {
    try {
      const id = req.params.id;
      await mealService.delete(req.user.id, id);
      sendSuccess(res, "Meal deleted successfully.");
    } catch (err) {
      sendError(res, err.message || "Failed to delete meal.", err.statusCode || 500);
    }
  }
};
var mealController = new MealController();

// src/modules/meals/meals.routes.ts
var router2 = Router2();
var mealSchema = z2.object({
  title: z2.string().min(2, "Title must be at least 2 characters"),
  description: z2.string().min(10, "Description must be at least 10 characters"),
  price: z2.coerce.number().positive("Price must be positive"),
  categoryId: z2.string().min(1, "Category is required"),
  image: z2.string().url("Must be a valid URL").optional(),
  images: z2.array(z2.string().url()).optional(),
  isAvailable: z2.boolean().optional(),
  isVegetarian: z2.boolean().optional(),
  isVegan: z2.boolean().optional(),
  isGlutenFree: z2.boolean().optional(),
  spiceLevel: z2.enum(["MILD", "MEDIUM", "HOT", "EXTRA_HOT"]).optional(),
  prepTime: z2.number().int().positive().optional(),
  calories: z2.number().int().positive().optional()
});
router2.get("/", (req, res) => mealController.getAll(req, res));
router2.get(
  "/featured",
  (req, res) => mealController.getFeatured(req, res)
);
router2.get(
  "/provider/mine",
  requireAuth,
  requireProvider,
  (req, res) => mealController.getProviderMeals(req, res)
);
router2.post(
  "/provider",
  requireAuth,
  requireProvider,
  validate(mealSchema),
  (req, res) => mealController.create(req, res)
);
router2.put(
  "/provider/:id",
  requireAuth,
  requireProvider,
  validate(mealSchema.partial()),
  (req, res) => mealController.update(req, res)
);
router2.patch(
  "/provider/:id/toggle",
  requireAuth,
  requireProvider,
  (req, res) => mealController.toggleAvailability(req, res)
);
router2.delete(
  "/provider/:id",
  requireAuth,
  requireProvider,
  (req, res) => mealController.delete(req, res)
);
router2.get("/:id", (req, res) => mealController.getById(req, res));
var meals_routes_default = router2;

// src/modules/orders/orders.routes.ts
import { Router as Router3 } from "express";
import { z as z3 } from "zod";

// src/modules/orders/orders.service.ts
var OrderService = class {
  async create(customerId, input) {
    const { items, address, note } = input;
    const mealIds = items.map((i) => i.mealId);
    const meals = await prisma_default.meal.findMany({ where: { id: { in: mealIds } } });
    if (meals.length !== mealIds.length) {
      const foundIds = meals.map((m) => m.id);
      const missing = mealIds.filter((id) => !foundIds.includes(id));
      throw { statusCode: 404, message: `Meal(s) not found: ${missing.join(", ")}` };
    }
    const unavailable = meals.filter((m) => !m.isAvailable);
    if (unavailable.length > 0) {
      throw {
        statusCode: 400,
        message: `These meals are currently unavailable: ${unavailable.map((m) => m.title).join(", ")}`
      };
    }
    const orderItems = items.map((item) => {
      const meal = meals.find((m) => m.id === item.mealId);
      return {
        mealId: meal.id,
        quantity: item.quantity,
        price: meal.price,
        name: meal.title
      };
    });
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await prisma_default.order.create({
      data: {
        customerId,
        totalAmount,
        address,
        deliveryCity: "N/A",
        deliveryPhone: "N/A",
        note: note ?? null,
        items: { create: orderItems }
      },
      include: {
        items: {
          include: {
            meal: {
              select: {
                title: true,
                image: true,
                provider: { select: { restaurantName: true } }
              }
            }
          }
        }
      }
    });
    return order;
  }
  async getCustomerOrders(customerId, filters) {
    const { page, limit, status } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = { customerId };
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma_default.order.findMany({
        where,
        include: {
          items: {
            include: {
              meal: {
                select: {
                  title: true,
                  image: true,
                  price: true,
                  provider: { select: { restaurantName: true, logo: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.order.count({ where })
    ]);
    return { orders, total, page: pageNum, limit: limitNum };
  }
  async getOrderById(orderId, requesterId, requesterRole) {
    const order = await prisma_default.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        items: {
          include: {
            meal: {
              select: {
                title: true,
                image: true,
                price: true,
                provider: { select: { id: true, restaurantName: true } }
              }
            }
          }
        }
      }
    });
    if (!order) throw { statusCode: 404, message: "Order not found." };
    if (order.customerId !== requesterId && requesterRole !== "ADMIN") {
      throw { statusCode: 403, message: "You are not authorized to view this order." };
    }
    return order;
  }
  async cancelOrder(orderId, customerId) {
    const order = await prisma_default.order.findUnique({ where: { id: orderId } });
    if (!order) throw { statusCode: 404, message: "Order not found." };
    if (order.customerId !== customerId) throw { statusCode: 403, message: "You cannot cancel someone else's order." };
    if (order.status !== "PLACED") {
      throw {
        statusCode: 400,
        message: `Order cannot be cancelled in ${order.status} status. Only PLACED orders can be cancelled.`
      };
    }
    return prisma_default.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: /* @__PURE__ */ new Date() }
    });
  }
};
var orderService = new OrderService();

// src/modules/orders/orders.controller.ts
var OrderController = class {
  async create(req, res) {
    try {
      const order = await orderService.create(req.user.id, req.body);
      sendSuccess(res, "Order placed successfully.", order, 201);
    } catch (err) {
      sendError(res, err.message || "Failed to place order.", err.statusCode || 500);
    }
  }
  async getMyOrders(req, res) {
    try {
      const { orders, total, page, limit } = await orderService.getCustomerOrders(req.user.id, req.query);
      sendSuccess(res, "Orders fetched successfully.", orders, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch orders.", err.statusCode || 500);
    }
  }
  async getById(req, res) {
    try {
      const id = req.params.id;
      const order = await orderService.getOrderById(id, req.user.id, req.user.role);
      sendSuccess(res, "Order fetched successfully.", order);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch order.", err.statusCode || 500);
    }
  }
  async cancel(req, res) {
    try {
      const id = req.params.id;
      const order = await orderService.cancelOrder(id, req.user.id);
      sendSuccess(res, "Order cancelled successfully.", order);
    } catch (err) {
      sendError(res, err.message || "Failed to cancel order.", err.statusCode || 500);
    }
  }
};
var orderController = new OrderController();

// src/modules/orders/orders.routes.ts
var router3 = Router3();
var createOrderSchema = z3.object({
  items: z3.array(
    z3.object({
      mealId: z3.string().min(1, "mealId is required"),
      quantity: z3.number().int().positive("Quantity must be a positive integer")
    })
  ).min(1, "Order must have at least one item"),
  address: z3.string().min(5, "Address is required"),
  note: z3.string().max(300).optional()
});
router3.post(
  "/",
  requireAuth,
  requireCustomer,
  validate(createOrderSchema),
  (req, res) => orderController.create(req, res)
);
router3.get(
  "/",
  requireAuth,
  requireCustomer,
  (req, res) => orderController.getMyOrders(req, res)
);
router3.get(
  "/:id",
  requireAuth,
  requireCustomer,
  (req, res) => orderController.getById(req, res)
);
router3.patch(
  "/:id/cancel",
  requireAuth,
  requireCustomer,
  (req, res) => orderController.cancel(req, res)
);
var orders_routes_default = router3;

// src/modules/providers/providers.routes.ts
import { Router as Router4 } from "express";
import { z as z4 } from "zod";

// src/modules/providers/providers.service.ts
var ORDER_TRANSITIONS = {
  PLACED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"]
};
var ProviderService = class {
  async getAll(filters) {
    const { page, limit, city, search } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = { status: "APPROVED", user: { status: "ACTIVE" } };
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (search) {
      where.OR = [
        { restaurantName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }
    const [providers, total] = await Promise.all([
      prisma_default.providerProfile.findMany({
        where,
        include: {
          user: true,
          meals: true
        },
        orderBy: { rating: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.providerProfile.count({ where })
    ]);
    const providersWithRatings = await Promise.all(
      providers.map(async (provider) => {
        const reviewAggregate = await prisma_default.review.aggregate({
          where: { meal: { providerId: provider.id } },
          _avg: { rating: true },
          _count: { rating: true }
        });
        return {
          ...provider,
          rating: reviewAggregate._avg.rating ? Math.round(reviewAggregate._avg.rating * 10) / 10 : 0,
          totalReviews: reviewAggregate._count.rating
        };
      })
    );
    return { providers: providersWithRatings, total, page: pageNum, limit: limitNum };
  }
  async getById(id) {
    const provider = await prisma_default.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { status: true, createdAt: true } },
        meals: {
          where: { isAvailable: true },
          include: { category: { select: { id: true, name: true, slug: true } } },
          orderBy: { rating: "desc" }
        },
        _count: { select: { meals: true } }
      }
    });
    if (!provider) throw { statusCode: 404, message: "Provider not found." };
    if (provider.status !== "APPROVED") {
      throw { statusCode: 404, message: "Provider not found." };
    }
    if (provider.user.status === "SUSPENDED") {
      throw { statusCode: 403, message: "This provider is currently unavailable." };
    }
    const reviewAggregate = await prisma_default.review.aggregate({
      where: { meal: { providerId: provider.id } },
      _avg: { rating: true },
      _count: { rating: true }
    });
    return {
      ...provider,
      rating: reviewAggregate._avg.rating ? Math.round(reviewAggregate._avg.rating * 10) / 10 : provider.rating,
      totalReviews: reviewAggregate._count.rating
    };
  }
  async updateProfile(userId, data) {
    const profile = await this._getProviderProfile(userId);
    return prisma_default.providerProfile.update({ where: { userId }, data });
  }
  async getMyProfile(userId) {
    return prisma_default.providerProfile.findUnique({ where: { userId } });
  }
  async getDashboardStats(userId) {
    const profile = await this._getProviderProfile(userId, false);
    if (profile.status !== "APPROVED") {
      return {
        profile,
        stats: {
          totalMeals: 0,
          totalOrders: 0,
          pendingOrders: 0,
          preparingOrders: 0,
          readyOrders: 0,
          deliveredOrders: 0,
          totalRevenue: 0
        },
        recentOrders: [],
        popularMeals: []
      };
    }
    const providerMealFilter = { items: { some: { meal: { providerId: profile.id } } } };
    const [totalMeals, totalOrders, pendingOrders, preparingOrders, readyOrders, deliveredOrders, revenueData, recentOrders, popularMeals] = await Promise.all([
      prisma_default.meal.count({ where: { providerId: profile.id } }),
      prisma_default.order.count({ where: providerMealFilter }),
      prisma_default.order.count({ where: { ...providerMealFilter, status: "PLACED" } }),
      prisma_default.order.count({ where: { ...providerMealFilter, status: "PREPARING" } }),
      prisma_default.order.count({ where: { ...providerMealFilter, status: "READY" } }),
      prisma_default.order.count({ where: { ...providerMealFilter, status: "DELIVERED" } }),
      prisma_default.order.aggregate({
        where: { ...providerMealFilter, status: "DELIVERED" },
        _sum: { totalAmount: true }
      }),
      prisma_default.order.findMany({
        where: providerMealFilter,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { include: { meal: { select: { title: true, price: true } } } }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma_default.meal.findMany({
        where: { providerId: profile.id },
        orderBy: { rating: "desc" },
        take: 5,
        select: { id: true, title: true, image: true, price: true, rating: true, totalReviews: true, _count: { select: { orderItems: true } } }
      })
    ]);
    return {
      profile,
      stats: {
        totalMeals,
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        deliveredOrders,
        totalRevenue: revenueData._sum.totalAmount || 0
      },
      recentOrders,
      popularMeals
    };
  }
  async getProviderOrders(userId, filters) {
    const profile = await this._getProviderProfile(userId, true);
    const { page, limit, status } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = { items: { some: { meal: { providerId: profile.id } } } };
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma_default.order.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { include: { meal: { select: { title: true, image: true, price: true } } } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.order.count({ where })
    ]);
    return { orders, total, page: pageNum, limit: limitNum };
  }
  async updateOrderStatus(userId, orderId, newStatus) {
    const profile = await this._getProviderProfile(userId, true);
    const order = await prisma_default.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { meal: true } } }
    });
    if (!order) throw { statusCode: 404, message: "Order not found." };
    const hasItems = order.items.some((item) => item.meal.providerId === profile.id);
    if (!hasItems) throw { statusCode: 403, message: "This order does not belong to your restaurant." };
    const allowedNext = ORDER_TRANSITIONS[order.status];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw {
        statusCode: 400,
        message: `Invalid status transition from ${order.status} to ${newStatus}. Allowed: ${(allowedNext || []).join(", ") || "none"}.`
      };
    }
    const timestampField = {
      PREPARING: "preparingAt",
      READY: "readyAt",
      DELIVERED: "deliveredAt",
      CANCELLED: "cancelledAt"
    };
    const updateData = { status: newStatus };
    if (timestampField[newStatus]) updateData[timestampField[newStatus]] = /* @__PURE__ */ new Date();
    const [updatedOrder] = await prisma_default.$transaction([
      prisma_default.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          customer: { select: { name: true, email: true } },
          items: { include: { meal: { select: { title: true } } } }
        }
      }),
      ...newStatus === "DELIVERED" ? [prisma_default.providerProfile.update({ where: { id: profile.id }, data: { totalOrders: { increment: 1 } } })] : []
    ]);
    return updatedOrder;
  }
  async _getProviderProfile(userId, requireApproved = false) {
    const profile = await prisma_default.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw { statusCode: 404, message: "Provider profile not found." };
    if (requireApproved && profile.status !== "APPROVED") {
      throw { statusCode: 403, message: "Provider account must be approved before this action can be performed." };
    }
    return profile;
  }
};
var providerService = new ProviderService();

// src/modules/providers/providers.controller.ts
var ProviderController = class {
  async getAll(req, res) {
    try {
      const { providers, total, page, limit } = await providerService.getAll(req.query);
      sendSuccess(res, "Providers fetched successfully.", providers, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch providers.", err.statusCode || 500);
    }
  }
  async getById(req, res) {
    try {
      const id = req.params.id;
      const provider = await providerService.getById(id);
      sendSuccess(res, "Provider fetched successfully.", provider);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch provider.", err.statusCode || 500);
    }
  }
  async updateProfile(req, res) {
    try {
      const profile = await providerService.updateProfile(req.user.id, req.body);
      sendSuccess(res, "Provider profile updated successfully.", profile);
    } catch (err) {
      sendError(res, err.message || "Failed to update profile.", err.statusCode || 500);
    }
  }
  async getMyProfile(req, res) {
    try {
      const profile = await providerService.getMyProfile(req.user.id);
      sendSuccess(res, "Provider profile fetched successfully.", profile);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch provider profile.", err.statusCode || 500);
    }
  }
  async getDashboardStats(req, res) {
    try {
      const data = await providerService.getDashboardStats(req.user.id);
      sendSuccess(res, "Dashboard stats fetched successfully.", data);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch dashboard stats.", err.statusCode || 500);
    }
  }
  async getOrders(req, res) {
    try {
      const { orders, total, page, limit } = await providerService.getProviderOrders(req.user.id, req.query);
      sendSuccess(res, "Orders fetched successfully.", orders, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch orders.", err.statusCode || 500);
    }
  }
  async updateOrderStatus(req, res) {
    try {
      const { status } = req.body;
      if (!status) {
        sendError(res, "status field is required.", 422);
        return;
      }
      const validStatuses = ["PREPARING", "READY", "DELIVERED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        sendError(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 422);
        return;
      }
      const orderId = req.params.orderId;
      const order = await providerService.updateOrderStatus(req.user.id, orderId, status);
      sendSuccess(res, "Order status updated successfully.", order);
    } catch (err) {
      sendError(res, err.message || "Failed to update order status.", err.statusCode || 500);
    }
  }
};
var providerController = new ProviderController();

// src/modules/providers/providers.routes.ts
var router4 = Router4();
var optionalUrl2 = z4.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return void 0;
    }
    return value;
  },
  z4.string().url("Must be a valid URL").optional()
);
var updateProviderSchema = z4.object({
  restaurantName: z4.string().min(2).optional(),
  description: z4.string().optional(),
  logo: optionalUrl2,
  banner: optionalUrl2,
  cuisineTypes: z4.array(z4.string()).optional(),
  address: z4.string().optional(),
  city: z4.string().optional(),
  phone: z4.string().optional()
});
router4.get("/", (req, res) => providerController.getAll(req, res));
router4.get(
  "/dashboard/stats",
  requireAuth,
  requireProvider,
  (req, res) => providerController.getDashboardStats(req, res)
);
router4.get(
  "/orders/mine",
  requireAuth,
  requireProvider,
  (req, res) => providerController.getOrders(req, res)
);
router4.patch(
  "/orders/:orderId/status",
  requireAuth,
  requireProvider,
  (req, res) => providerController.updateOrderStatus(req, res)
);
router4.get(
  "/profile/me",
  requireAuth,
  requireProvider,
  (req, res) => providerController.getMyProfile(req, res)
);
router4.patch(
  "/profile/me",
  requireAuth,
  requireProvider,
  validate(updateProviderSchema),
  (req, res) => providerController.updateProfile(req, res)
);
router4.get("/:id", (req, res) => providerController.getById(req, res));
var providers_routes_default = router4;

// src/modules/categories/categories.routes.ts
import { Router as Router5 } from "express";
import { z as z5 } from "zod";

// src/modules/categories/categories.service.ts
var slugify = (text) => text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
var CategoryService = class {
  async getAll() {
    return prisma_default.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { meals: true } } },
      orderBy: { name: "asc" }
    });
  }
  async getAllForAdmin() {
    return prisma_default.category.findMany({
      include: { _count: { select: { meals: true } } },
      orderBy: { name: "asc" }
    });
  }
  async getById(id) {
    const category = await prisma_default.category.findUnique({
      where: { id },
      include: {
        meals: {
          where: { isAvailable: true },
          include: {
            provider: { select: { restaurantName: true, rating: true } }
          },
          take: 20
        },
        _count: { select: { meals: true } }
      }
    });
    if (!category) throw { statusCode: 404, message: "Category not found." };
    return category;
  }
  async create(data) {
    const existing = await prisma_default.category.findFirst({ where: { name: data.name } });
    if (existing) throw { statusCode: 409, message: "Category with this name already exists." };
    return prisma_default.category.create({
      data: { ...data, slug: slugify(data.name) }
    });
  }
  async update(id, data) {
    const existing = await prisma_default.category.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Category not found." };
    const updateData = { ...data };
    if (data.name) updateData.slug = slugify(data.name);
    return prisma_default.category.update({ where: { id }, data: updateData });
  }
  async toggleActive(id) {
    const existing = await prisma_default.category.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Category not found." };
    return prisma_default.category.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });
  }
  async delete(id) {
    const existing = await prisma_default.category.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Category not found." };
    const mealCount = await prisma_default.meal.count({ where: { categoryId: id } });
    if (mealCount > 0) {
      throw { statusCode: 400, message: `Cannot delete category with ${mealCount} associated meal(s). Reassign meals first.` };
    }
    await prisma_default.category.delete({ where: { id } });
  }
};
var categoryService = new CategoryService();

// src/modules/categories/categories.controller.ts
var CategoryController = class {
  async getAll(req, res) {
    try {
      const isAdmin = req.user?.role === "ADMIN";
      const categories = isAdmin ? await categoryService.getAllForAdmin() : await categoryService.getAll();
      sendSuccess(res, "Categories fetched successfully.", categories);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch categories.", err.statusCode || 500);
    }
  }
  async getById(req, res) {
    try {
      const id = req.params.id;
      const category = await categoryService.getById(id);
      sendSuccess(res, "Category fetched successfully.", category);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch category.", err.statusCode || 500);
    }
  }
  async create(req, res) {
    try {
      const category = await categoryService.create(req.body);
      sendSuccess(res, "Category created successfully.", category, 201);
    } catch (err) {
      sendError(res, err.message || "Failed to create category.", err.statusCode || 500);
    }
  }
  async update(req, res) {
    try {
      const id = req.params.id;
      const category = await categoryService.update(id, req.body);
      sendSuccess(res, "Category updated successfully.", category);
    } catch (err) {
      sendError(res, err.message || "Failed to update category.", err.statusCode || 500);
    }
  }
  async toggleActive(req, res) {
    try {
      const id = req.params.id;
      const category = await categoryService.toggleActive(id);
      sendSuccess(res, `Category ${category.isActive ? "activated" : "deactivated"} successfully.`, category);
    } catch (err) {
      sendError(res, err.message || "Failed to toggle category.", err.statusCode || 500);
    }
  }
  async delete(req, res) {
    try {
      const id = req.params.id;
      await categoryService.delete(id);
      sendSuccess(res, "Category deleted successfully.");
    } catch (err) {
      sendError(res, err.message || "Failed to delete category.", err.statusCode || 500);
    }
  }
};
var categoryController = new CategoryController();

// src/modules/categories/categories.routes.ts
var router5 = Router5();
var categorySchema = z5.object({
  name: z5.string().min(2, "Name must be at least 2 characters"),
  description: z5.string().optional(),
  image: z5.string().url("Must be a valid URL").optional()
});
router5.get(
  "/",
  optionalAuth,
  (req, res) => categoryController.getAll(req, res)
);
router5.get("/:id", (req, res) => categoryController.getById(req, res));
router5.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(categorySchema),
  (req, res) => categoryController.create(req, res)
);
router5.put(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(categorySchema.partial()),
  (req, res) => categoryController.update(req, res)
);
router5.patch(
  "/:id/toggle",
  requireAuth,
  requireAdmin,
  (req, res) => categoryController.toggleActive(req, res)
);
router5.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  (req, res) => categoryController.delete(req, res)
);
var categories_routes_default = router5;

// src/modules/admin/admin.routes.ts
import { Router as Router6 } from "express";

// src/modules/admin/admin.service.ts
var AdminService = class {
  async getDashboardStats() {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalOrders,
      totalMeals,
      totalCategories,
      revenueData,
      recentOrders,
      ordersByStatus,
      topProviders
    ] = await Promise.all([
      prisma_default.user.count(),
      prisma_default.user.count({ where: { role: "CUSTOMER" } }),
      prisma_default.user.count({ where: { role: "PROVIDER" } }),
      prisma_default.order.count(),
      prisma_default.meal.count(),
      prisma_default.category.count(),
      prisma_default.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { totalAmount: true }
      }),
      prisma_default.order.findMany({
        include: {
          customer: { select: { name: true, email: true } },
          items: { include: { meal: { select: { title: true } } }, take: 3 }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma_default.order.groupBy({ by: ["status"], _count: true }),
      prisma_default.providerProfile.findMany({
        orderBy: { rating: "desc" },
        take: 5,
        select: {
          id: true,
          restaurantName: true,
          city: true,
          rating: true,
          totalOrders: true,
          isVerified: true,
          logo: true
        }
      })
    ]);
    return {
      stats: {
        totalUsers,
        totalCustomers,
        totalProviders,
        totalOrders,
        totalMeals,
        totalCategories,
        totalRevenue: revenueData._sum.totalAmount || 0
      },
      ordersByStatus,
      recentOrders,
      topProviders
    };
  }
  async getAllUsers(filters) {
    const { page, limit, role, status, search } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    const [users, total] = await Promise.all([
      prisma_default.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          image: true,
          phone: true,
          createdAt: true,
          providerProfile: { select: { restaurantName: true, city: true, isVerified: true, rating: true } },
          _count: { select: { orders: true, reviews: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.user.count({ where })
    ]);
    return { users, total, page: pageNum, limit: limitNum };
  }
  async getUserById(id) {
    const user = await prisma_default.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true,
        createdAt: true,
        providerProfile: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { items: { include: { meal: { select: { title: true } } } } }
        },
        _count: { select: { orders: true, reviews: true } }
      }
    });
    if (!user) throw { statusCode: 404, message: "User not found." };
    return user;
  }
  async updateUserStatus(adminId, targetId, status) {
    if (adminId === targetId) {
      throw { statusCode: 400, message: "You cannot change your own account status." };
    }
    const user = await prisma_default.user.findUnique({ where: { id: targetId } });
    if (!user) throw { statusCode: 404, message: "User not found." };
    if (user.role === "ADMIN") throw { statusCode: 403, message: "Admin accounts cannot be modified." };
    return prisma_default.user.update({
      where: { id: targetId },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true }
    });
  }
  async deleteUser(adminId, targetId) {
    if (adminId === targetId) {
      throw { statusCode: 400, message: "You cannot delete your own account." };
    }
    const user = await prisma_default.user.findUnique({ where: { id: targetId } });
    if (!user) throw { statusCode: 404, message: "User not found." };
    if (user.role === "ADMIN") throw { statusCode: 403, message: "Admin accounts cannot be deleted." };
    await prisma_default.user.delete({ where: { id: targetId } });
  }
  async getAllOrders(filters) {
    const { page, limit, status } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = {};
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma_default.order.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true } },
          items: {
            include: {
              meal: {
                select: {
                  title: true,
                  provider: { select: { restaurantName: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.order.count({ where })
    ]);
    return { orders, total, page: pageNum, limit: limitNum };
  }
  async getAllProviders(filters) {
    const { page, limit } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const [providers, total] = await Promise.all([
      prisma_default.providerProfile.findMany({
        include: {
          user: { select: { name: true, email: true, status: true, createdAt: true } },
          _count: { select: { meals: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.providerProfile.count()
    ]);
    return { providers, total, page: pageNum, limit: limitNum };
  }
  async getPendingProviders(filters) {
    const { page, limit } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const where = { status: "PENDING" };
    const [providers, total] = await Promise.all([
      prisma_default.providerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
          _count: { select: { meals: true } }
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limitNum
      }),
      prisma_default.providerProfile.count({ where })
    ]);
    return { providers, total, page: pageNum, limit: limitNum };
  }
  async approveProvider(providerId) {
    const profile = await prisma_default.providerProfile.findUnique({ where: { id: providerId } });
    if (!profile) throw { statusCode: 404, message: "Provider not found." };
    return prisma_default.providerProfile.update({
      where: { id: providerId },
      data: { status: "APPROVED", isVerified: true }
    });
  }
  async rejectProvider(providerId) {
    const profile = await prisma_default.providerProfile.findUnique({ where: { id: providerId } });
    if (!profile) throw { statusCode: 404, message: "Provider not found." };
    return prisma_default.providerProfile.update({
      where: { id: providerId },
      data: { status: "REJECTED", isVerified: false }
    });
  }
  async toggleProviderVerification(providerId) {
    const profile = await prisma_default.providerProfile.findUnique({ where: { id: providerId } });
    if (!profile) throw { statusCode: 404, message: "Provider not found." };
    return prisma_default.providerProfile.update({
      where: { id: providerId },
      data: { isVerified: !profile.isVerified }
    });
  }
};
var adminService = new AdminService();

// src/modules/admin/admin.controller.ts
var AdminController = class {
  async getDashboard(_req, res) {
    try {
      const data = await adminService.getDashboardStats();
      sendSuccess(res, "Dashboard stats fetched successfully.", data);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch dashboard.", err.statusCode || 500);
    }
  }
  async getUsers(req, res) {
    try {
      const { users, total, page, limit } = await adminService.getAllUsers(req.query);
      sendSuccess(res, "Users fetched successfully.", users, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch users.", err.statusCode || 500);
    }
  }
  async getUserById(req, res) {
    try {
      const targetId = req.params.id;
      const user = await adminService.getUserById(targetId);
      sendSuccess(res, "User fetched successfully.", user);
    } catch (err) {
      sendError(res, err.message || "Failed to fetch user.", err.statusCode || 500);
    }
  }
  async updateUserStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ["ACTIVE", "SUSPENDED"];
      if (!validStatuses.includes(status)) {
        sendError(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 422);
        return;
      }
      const targetId = req.params.id;
      const user = await adminService.updateUserStatus(req.user.id, targetId, status);
      sendSuccess(res, `User ${status === "SUSPENDED" ? "suspended" : "activated"} successfully.`, user);
    } catch (err) {
      sendError(res, err.message || "Failed to update user status.", err.statusCode || 500);
    }
  }
  async deleteUser(req, res) {
    try {
      const targetId = req.params.id;
      await adminService.deleteUser(req.user.id, targetId);
      sendSuccess(res, "User deleted successfully.");
    } catch (err) {
      sendError(res, err.message || "Failed to delete user.", err.statusCode || 500);
    }
  }
  async getOrders(req, res) {
    try {
      const { orders, total, page, limit } = await adminService.getAllOrders(req.query);
      sendSuccess(res, "Orders fetched successfully.", orders, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch orders.", err.statusCode || 500);
    }
  }
  async getProviders(req, res) {
    try {
      const { providers, total, page, limit } = await adminService.getAllProviders(req.query);
      sendSuccess(res, "Providers fetched successfully.", providers, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch providers.", err.statusCode || 500);
    }
  }
  async getPendingProviders(req, res) {
    try {
      const { providers, total, page, limit } = await adminService.getPendingProviders(req.query);
      sendSuccess(res, "Pending providers fetched successfully.", providers, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch pending providers.", err.statusCode || 500);
    }
  }
  async approveProvider(req, res) {
    try {
      const providerId = req.params.id;
      const profile = await adminService.approveProvider(providerId);
      sendSuccess(res, "Provider approved successfully.", profile);
    } catch (err) {
      sendError(res, err.message || "Failed to approve provider.", err.statusCode || 500);
    }
  }
  async rejectProvider(req, res) {
    try {
      const providerId = req.params.id;
      const profile = await adminService.rejectProvider(providerId);
      sendSuccess(res, "Provider rejected successfully.", profile);
    } catch (err) {
      sendError(res, err.message || "Failed to reject provider.", err.statusCode || 500);
    }
  }
  async toggleProviderVerification(req, res) {
    try {
      const providerId = req.params.id;
      const profile = await adminService.toggleProviderVerification(providerId);
      sendSuccess(res, `Provider ${profile.isVerified ? "verified" : "unverified"} successfully.`, profile);
    } catch (err) {
      sendError(res, err.message || "Failed to toggle verification.", err.statusCode || 500);
    }
  }
};
var adminController = new AdminController();

// src/modules/admin/admin.routes.ts
var router6 = Router6();
router6.use(requireAuth, requireAdmin);
router6.get("/dashboard", (req, res) => adminController.getDashboard(req, res));
router6.get("/users", (req, res) => adminController.getUsers(req, res));
router6.get("/users/:id", (req, res) => adminController.getUserById(req, res));
router6.patch("/users/:id", (req, res) => adminController.updateUserStatus(req, res));
router6.patch("/users/:id/status", (req, res) => adminController.updateUserStatus(req, res));
router6.delete("/users/:id", (req, res) => adminController.deleteUser(req, res));
router6.get("/orders", (req, res) => adminController.getOrders(req, res));
router6.get("/providers", (req, res) => adminController.getProviders(req, res));
router6.get("/providers/pending", (req, res) => adminController.getPendingProviders(req, res));
router6.patch("/providers/:id/approve", (req, res) => adminController.approveProvider(req, res));
router6.patch("/providers/:id/reject", (req, res) => adminController.rejectProvider(req, res));
router6.patch("/providers/:id/verify", (req, res) => adminController.toggleProviderVerification(req, res));
var admin_routes_default = router6;

// src/modules/reviews/reviews.routes.ts
import { Router as Router7 } from "express";
import { z as z6 } from "zod";

// src/modules/reviews/reviews.service.ts
var ReviewService = class {
  async getByMeal(mealId, page, limit) {
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    const [reviews, total, aggregate] = await Promise.all([
      prisma_default.review.findMany({
        where: { mealId },
        include: { customer: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma_default.review.count({ where: { mealId } }),
      prisma_default.review.aggregate({
        where: { mealId },
        _avg: { rating: true },
        _count: { rating: true }
      })
    ]);
    return {
      reviews,
      total,
      page: pageNum,
      limit: limitNum,
      averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
      totalReviews: aggregate._count.rating
    };
  }
  async create(userId, input) {
    const { orderId, mealId, rating, comment } = input;
    const meal = await prisma_default.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    const order = await prisma_default.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    if (!order || order.customerId !== userId) {
      throw { statusCode: 404, message: "Order not found." };
    }
    if (order.status !== "DELIVERED") {
      throw {
        statusCode: 400,
        message: "You can only review meals from orders that have been delivered."
      };
    }
    const itemInOrder = order.items.some((item) => item.mealId === mealId);
    if (!itemInOrder) {
      throw {
        statusCode: 400,
        message: "This meal is not part of the selected order."
      };
    }
    const existing = await prisma_default.review.findUnique({
      where: { orderId_mealId: { orderId, mealId } }
    });
    if (existing) {
      throw {
        statusCode: 409,
        message: "You have already reviewed this meal for this order."
      };
    }
    const review = await prisma_default.review.create({
      data: {
        userId,
        mealId,
        orderId,
        rating,
        comment: comment ?? null
      },
      include: { customer: { select: { name: true, image: true } } }
    });
    await this._recalculateMealRating(mealId);
    return review;
  }
  async update(userId, reviewId, data) {
    const review = await prisma_default.review.findUnique({ where: { id: reviewId } });
    if (!review) throw { statusCode: 404, message: "Review not found." };
    if (review.userId !== userId) throw { statusCode: 403, message: "You cannot edit someone else's review." };
    const updated = await prisma_default.review.update({
      where: { id: reviewId },
      data,
      include: { customer: { select: { name: true, image: true } } }
    });
    await this._recalculateMealRating(review.mealId);
    return updated;
  }
  async delete(requesterId, requesterRole, reviewId) {
    const review = await prisma_default.review.findUnique({ where: { id: reviewId } });
    if (!review) throw { statusCode: 404, message: "Review not found." };
    if (review.userId !== requesterId && requesterRole !== "ADMIN") {
      throw { statusCode: 403, message: "You cannot delete someone else's review." };
    }
    await prisma_default.review.delete({ where: { id: reviewId } });
    await this._recalculateMealRating(review.mealId);
  }
  async _recalculateMealRating(mealId) {
    const meal = await prisma_default.meal.findUnique({ where: { id: mealId }, select: { providerId: true } });
    if (!meal) return;
    const { _avg, _count } = await prisma_default.review.aggregate({
      where: { mealId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    await prisma_default.meal.update({
      where: { id: mealId },
      data: {
        rating: _avg.rating ? Math.round(_avg.rating * 10) / 10 : 0,
        totalReviews: _count.rating
      }
    });
    await this._recalculateProviderRating(meal.providerId);
  }
  async _recalculateProviderRating(providerId) {
    const { _avg } = await prisma_default.review.aggregate({
      where: { meal: { providerId } },
      _avg: { rating: true }
    });
    await prisma_default.providerProfile.update({
      where: { id: providerId },
      data: {
        rating: _avg.rating ? Math.round(_avg.rating * 10) / 10 : 0
      }
    });
  }
};
var reviewService = new ReviewService();

// src/modules/reviews/reviews.controller.ts
var ReviewController = class {
  async getByMeal(req, res) {
    try {
      const { page, limit } = req.query;
      const mealId = req.params.mealId;
      const data = await reviewService.getByMeal(mealId, page, limit);
      sendSuccess(res, "Reviews fetched successfully.", data.reviews, 200, {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(data.total / data.limit)
      });
    } catch (err) {
      sendError(res, err.message || "Failed to fetch reviews.", err.statusCode || 500);
    }
  }
  async create(req, res) {
    try {
      if (req.user.role !== "CUSTOMER") {
        sendError(res, "Only customers can submit reviews.", 403);
        return;
      }
      const review = await reviewService.create(req.user.id, req.body);
      sendSuccess(res, "Review submitted successfully.", review, 201);
    } catch (err) {
      sendError(res, err.message || "Failed to submit review.", err.statusCode || 500);
    }
  }
  async update(req, res) {
    try {
      const reviewId = req.params.id;
      const review = await reviewService.update(req.user.id, reviewId, req.body);
      sendSuccess(res, "Review updated successfully.", review);
    } catch (err) {
      sendError(res, err.message || "Failed to update review.", err.statusCode || 500);
    }
  }
  async delete(req, res) {
    try {
      const reviewId = req.params.id;
      await reviewService.delete(req.user.id, req.user.role, reviewId);
      sendSuccess(res, "Review deleted successfully.");
    } catch (err) {
      sendError(res, err.message || "Failed to delete review.", err.statusCode || 500);
    }
  }
};
var reviewController = new ReviewController();

// src/modules/reviews/reviews.routes.ts
var router7 = Router7();
var createReviewSchema = z6.object({
  orderId: z6.string().min(1, "orderId is required"),
  mealId: z6.string().min(1, "mealId is required"),
  rating: z6.number().int().min(1, "Min rating is 1").max(5, "Max rating is 5"),
  comment: z6.string().max(500, "Comment cannot exceed 500 characters").optional()
});
var updateReviewSchema = z6.object({
  rating: z6.number().int().min(1).max(5).optional(),
  comment: z6.string().max(500).optional()
});
router7.get("/meal/:mealId", (req, res) => reviewController.getByMeal(req, res));
router7.post(
  "/",
  requireAuth,
  validate(createReviewSchema),
  (req, res) => reviewController.create(req, res)
);
router7.put(
  "/:id",
  requireAuth,
  validate(updateReviewSchema),
  (req, res) => reviewController.update(req, res)
);
router7.delete(
  "/:id",
  requireAuth,
  (req, res) => reviewController.delete(req, res)
);
var reviews_routes_default = router7;

// src/modules/admin/admin.categories.routes.ts
import { Router as Router8 } from "express";
import { z as z7 } from "zod";
var router8 = Router8();
var categorySchema2 = z7.object({
  name: z7.string().min(2, "Name must be at least 2 characters"),
  description: z7.string().optional(),
  image: z7.string().url("Must be a valid URL").optional()
});
router8.use(requireAuth, requireAdmin);
router8.get("/", (req, res) => categoryController.getAll(req, res));
router8.get("/:id", (req, res) => categoryController.getById(req, res));
router8.post(
  "/",
  validate(categorySchema2),
  (req, res) => categoryController.create(req, res)
);
router8.put(
  "/:id",
  validate(categorySchema2.partial()),
  (req, res) => categoryController.update(req, res)
);
router8.patch(
  "/:id/toggle",
  (req, res) => categoryController.toggleActive(req, res)
);
router8.delete("/:id", (req, res) => categoryController.delete(req, res));
var admin_categories_routes_default = router8;

// src/modules/cloudinary/cloudinary.routes.ts
import { Router as Router9 } from "express";

// src/modules/cloudinary/cloudinary.service.ts
import { v2 as cloudinary } from "cloudinary";
var generateUploadSignature = () => {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary API key or cloud name is not configured");
  }
  const timestamp = Math.floor(Date.now() / 1e3);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || "unsigned"
    },
    process.env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME
  };
};

// src/modules/cloudinary/cloudinary.controller.ts
var getUploadSignature = async (req, res) => {
  try {
    const signatureData = generateUploadSignature();
    sendResponse(res, 200, "Upload signature generated successfully", signatureData);
  } catch (error) {
    console.error("Error generating upload signature:", error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : "Failed to generate upload signature";
    sendResponse(res, statusCode, message, null);
  }
};

// src/modules/cloudinary/cloudinary.routes.ts
var router9 = Router9();
router9.post("/signature", requireAuth, getUploadSignature);
var cloudinary_routes_default = router9;

// src/modules/images/images.routes.ts
import { Router as Router10 } from "express";

// src/modules/images/images.service.ts
var createImage = async (data) => {
  try {
    const image = await prisma.image.create({
      data: {
        url: data.url,
        publicId: data.publicId,
        userId: data.userId
      }
    });
    return image;
  } catch (error) {
    console.error("Error creating image record:", error);
    throw error;
  }
};
var getImagesByUserId = async (userId) => {
  try {
    const images = await prisma.image.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return images;
  } catch (error) {
    console.error("Error fetching user images:", error);
    throw error;
  }
};
var getImageByPublicId = async (publicId) => {
  try {
    const image = await prisma.image.findUnique({
      where: { publicId }
    });
    return image;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
};
var deleteImage = async (publicId) => {
  try {
    const image = await prisma.image.delete({
      where: { publicId }
    });
    return image;
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

// src/modules/images/images.controller.ts
var uploadImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, "Unauthorized", null);
      return;
    }
    const { secure_url, public_id } = req.body;
    if (!secure_url || !public_id) {
      sendResponse(res, 400, "Missing required fields: secure_url, public_id", null);
      return;
    }
    const image = await createImage({
      url: secure_url,
      publicId: public_id,
      userId
    });
    sendResponse(res, 201, "Image uploaded successfully", image);
  } catch (error) {
    console.error("Error uploading image:", error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : "Failed to upload image";
    sendResponse(res, statusCode, message, null);
  }
};
var getUserImages = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, "Unauthorized", null);
      return;
    }
    const images = await getImagesByUserId(userId);
    sendResponse(res, 200, "Images fetched successfully", images);
  } catch (error) {
    console.error("Error fetching images:", error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : "Failed to fetch images";
    sendResponse(res, statusCode, message, null);
  }
};
var getImage = async (req, res) => {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;
    if (!publicId) {
      sendResponse(res, 400, "Public ID is required", null);
      return;
    }
    const image = await getImageByPublicId(publicId);
    if (!image) {
      sendResponse(res, 404, "Image not found", null);
      return;
    }
    sendResponse(res, 200, "Image fetched successfully", image);
  } catch (error) {
    console.error("Error fetching image:", error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : "Failed to fetch image";
    sendResponse(res, statusCode, message, null);
  }
};
var removeImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, "Unauthorized", null);
      return;
    }
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;
    if (!publicId) {
      sendResponse(res, 400, "Public ID is required", null);
      return;
    }
    const image = await getImageByPublicId(publicId);
    if (!image) {
      sendResponse(res, 404, "Image not found", null);
      return;
    }
    if (image.userId !== userId) {
      sendResponse(res, 403, "Forbidden: Cannot delete other users images", null);
      return;
    }
    const deleted = await deleteImage(publicId);
    sendResponse(res, 200, "Image deleted successfully", deleted);
  } catch (error) {
    console.error("Error deleting image:", error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : "Failed to delete image";
    sendResponse(res, statusCode, message, null);
  }
};

// src/modules/images/images.routes.ts
var router10 = Router10();
router10.post("/", requireAuth, uploadImage);
router10.get("/", requireAuth, getUserImages);
router10.get("/:publicId", getImage);
router10.delete("/:publicId", requireAuth, removeImage);
var images_routes_default = router10;

// src/middleware/error.middleware.ts
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
var notFoundHandler = (req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found.`, 404);
};
var globalErrorHandler = (err, req, res, _next) => {
  console.error("Global Error:", err);
  if (err instanceof ZodError) {
    sendError(
      res,
      "Validation failed.",
      422,
      err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    );
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, "A record with this value already exists.", 409);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "Record not found.", 404);
      return;
    }
    sendError(res, "Database error.", 500, err.message);
    return;
  }
  sendError(
    res,
    process.env.NODE_ENV === "production" ? "Internal server error." : err.message,
    500
  );
};

// src/app.ts
var app = express();
var normalizeOrigin2 = (origin) => origin?.replace(/\/$/, "") || "";
var allowedOrigins = [
  normalizeOrigin2(process.env.FRONTEND_URL),
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://foodhub-server-seven.vercel.app",
  "https://foodhub-seven-navy.vercel.app"
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(normalizeOrigin2(origin))) return callback(null, true);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
app.use("/auth", auth_routes_default);
app.use("/api/auth", auth_routes_default);
app.use("/api/v1/auth", auth_routes_default);
app.use("/auth", toNodeHandler2(auth));
app.use("/api/auth", toNodeHandler2(auth));
app.use("/api/v1/auth", toNodeHandler2(auth));
app.use("/api/meals", meals_routes_default);
app.use("/api/orders", orders_routes_default);
app.use("/api/providers", providers_routes_default);
app.use("/api/categories", categories_routes_default);
app.use("/api/admin", admin_routes_default);
app.use("/api/reviews", reviews_routes_default);
app.use("/api/cloudinary", cloudinary_routes_default);
app.use("/api/images", images_routes_default);
app.use("/api/v1/meals", meals_routes_default);
app.use("/api/v1/orders", orders_routes_default);
app.use("/api/v1/providers", providers_routes_default);
app.use("/api/v1/categories", categories_routes_default);
app.use("/api/v1/admin", admin_routes_default);
app.use("/api/v1/reviews", reviews_routes_default);
app.use("/api/v1/cloudinary", cloudinary_routes_default);
app.use("/api/v1/images", images_routes_default);
app.use("/api/admin/categories", admin_categories_routes_default);
app.get("/", (_req, res) => {
  res.send("Welcome to FoodHub");
});
app.use(notFoundHandler);
app.use(globalErrorHandler);
var app_default = app;

// src/index.ts
var index_default = app_default;
export {
  index_default as default
};

import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth";

import authRoutes from "./modules/auth/auth.routes";
import mealRoutes from "./modules/meals/meals.routes";
import orderRoutes from "./modules/orders/orders.routes";
import providerRoutes from "./modules/providers/providers.routes";
import categoryRoutes from "./modules/categories/categories.routes";
import adminRoutes from "./modules/admin/admin.routes";
import reviewRoutes from "./modules/reviews/reviews.routes";
import adminCategoriesRoutes from "./modules/admin/admin.categories.routes";
import contactRoutes from "./modules/contact/contact.routes";
import cloudinaryRoutes from "./modules/cloudinary/cloudinary.routes";
import imagesRoutes from "./modules/images/images.routes";

import { globalErrorHandler, notFoundHandler } from "./middleware/error.middleware";

const app: Application = express();

const normalizeOrigin = (origin?: string) => origin?.replace(/\/$/, "") || "";
const allowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://foodhub-server-seven.vercel.app",
  "https://foodhub-seven-navy.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", authRoutes);

app.use("/auth", toNodeHandler(auth));
app.use("/api/auth", toNodeHandler(auth));
app.use("/api/v1/auth", toNodeHandler(auth));

app.use("/api/meals", mealRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/images", imagesRoutes);

app.use("/api/v1/meals", mealRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/cloudinary", cloudinaryRoutes);
app.use("/api/v1/images", imagesRoutes);
app.use("/api/admin/categories", adminCategoriesRoutes);


app.get("/", (_req, res) => {
  res.send("Welcome to FoodHub");
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
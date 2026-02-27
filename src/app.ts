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

import { notFoundHandler, globalErrorHandler } from "./middleware/error.middleware";

const app: Application = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", toNodeHandler(auth));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/meals", mealRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/reviews", reviewRoutes);


app.get("/", (_req, res) => {
  res.send("Welcome to FoodHub");
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
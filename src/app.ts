import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth";

import authRoutes from "./modules/auth/auth.routes";
import mealRoutes from "./modules/meals/meals.routes";

import { globalErrorHandler } from "./middleware/error.middleware";

const app: Application = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.all("/api/auth/*splat", toNodeHandler(auth));


app.use("/auth", authRoutes);
app.use("/meals", mealRoutes);

app.get("/", (_req, res) => {
  res.send("Welcome to FoodHub");
});

app.use(globalErrorHandler);

export default app;
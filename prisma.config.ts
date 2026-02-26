// prisma.config.ts
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
import path from "path";

// Load env manually
dotenv.config({ path: path.resolve(__dirname, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in .env");
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "./prisma/migrations",
  },
});
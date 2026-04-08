import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-in-production",

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
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

export type Auth = typeof auth;
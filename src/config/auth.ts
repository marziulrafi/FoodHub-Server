import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

const normalizeOrigin = (url?: string) => url?.replace(/\/+$/, "") || "";
const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL) || "http://localhost:3000";
const defaultFrontendUrls = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://foodhub-server-seven.vercel.app",
  "https://foodhub-seven-navy.vercel.app",
].map(normalizeOrigin);

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

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  defaultCookieAttributes: {
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  },

  trustedOrigins: Array.from(new Set([frontendUrl, ...defaultFrontendUrls])),
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
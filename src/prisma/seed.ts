import "dotenv/config";
import { Role, UserStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { authService } from "../modules/auth/auth.service";

async function main() {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin account already exists. Skipping seed.");
    return;
  }
  await authService.register({
    name: "Admin",
    email,
    password,
    role: Role.ADMIN,
  });

  await prisma.user.update({
    where: { email },
    data: { status: UserStatus.ACTIVE, role: Role.ADMIN },
  });

  console.log("Seed completed: admin user created.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

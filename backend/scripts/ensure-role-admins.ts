import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Role = "superadmin" | "admin" | "editor" | "viewer";

const DEFAULT_PASSWORD =
  process.env.ROLE_ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  "admin123";

const roleUsers: Array<{ email: string; role: Role; name: string }> = [
  {
    email: "superadmin@electricalsupplier.com",
    role: "superadmin",
    name: "Super Administrator",
  },
  {
    email: "admin@electricalsupplier.com",
    role: "admin",
    name: "Administrator",
  },
  {
    email: "editor@electricalsupplier.com",
    role: "editor",
    name: "Content Editor",
  },
  {
    email: "viewer@electricalsupplier.com",
    role: "viewer",
    name: "Content Viewer",
  },
];

async function upsertAdmin(email: string, role: Role, name: string) {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const existing = await prisma.admin.findUnique({ where: { email } });

  if (existing) {
    await prisma.admin.update({
      where: { email },
      data: {
        role,
        name,
        isActive: true,
        // Reset credentials to known values for local/dev testing
        password: hashedPassword,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });
    return { action: "updated", email, role };
  }

  await prisma.admin.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    },
  });

  return { action: "created", email, role };
}

async function main() {
  console.log("\n🔐 Ensuring role-based admin accounts exist (idempotent)...\n");
  const passwordSource = process.env.ROLE_ADMIN_PASSWORD
    ? "ROLE_ADMIN_PASSWORD"
    : process.env.SEED_ADMIN_PASSWORD
      ? "SEED_ADMIN_PASSWORD"
      : "dev default";
  console.log(`Password source: ${passwordSource} (not printed)`);

  for (const u of roleUsers) {
    const result = await upsertAdmin(u.email, u.role, u.name);
    console.log(`- ${result.action}: ${result.email} (${result.role})`);
  }

  console.log("\n✅ Done.\n");
  console.log("Login emails:");
  for (const u of roleUsers) {
    console.log(`- ${u.email} (${u.role})`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Failed to ensure role admins", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

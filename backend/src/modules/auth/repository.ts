import { prisma } from "../../config/db";
import bcrypt from "bcryptjs";
import { Admin } from "@prisma/client";

/**
 * Auth Repository
 *
 * Database access layer for authentication operations.
 * Handles admin account management and password security.
 *
 * **Password Security:**
 * - Uses bcryptjs for password hashing
 * - Configurable salt rounds from environment (BCRYPT_ROUNDS)
 * - Passwords never stored in plain text
 * - Comparison done through bcrypt.compare (timing-safe)
 *
 * **Admin Management:**
 * - Lookup by email (for login)
 * - Lookup by ID (for session validation)
 * - Account creation with hashed password
 * - Account updates (profile, password changes)
 *
 * **Security Best Practices:**
 * - Email lookups are case-sensitive (normalized at service layer)
 * - Password verification uses timing-safe comparison
 * - Hash rounds configurable for performance vs security tradeoff
 *
 * @see {@link https://github.com/kelektiv/node.bcrypt.js bcryptjs documentation}
 */
export class AuthRepository {
  async findAdminByEmail(email: string): Promise<Admin | null> {
    return prisma.admin.findUnique({
      where: { email },
    });
  }

  async findAdminById(id: string): Promise<Admin | null> {
    return prisma.admin.findUnique({
      where: { id },
    });
  }

  async updateAdmin(id: string, data: Partial<Admin>): Promise<Admin> {
    return prisma.admin.update({
      where: { id },
      data,
    });
  }

  async createAdmin(
    email: string,
    password: string,
    name: string,
  ): Promise<Admin> {
    return prisma.admin.create({
      data: {
        email,
        password,
        name,
      },
    });
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    const { BCRYPT_ROUNDS } = await import("../../config/env").then(
      (m) => m.env,
    );
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}

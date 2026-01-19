import { prisma } from "../../config/db";
import bcrypt from "bcryptjs";
import { Admin } from "@prisma/client";

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

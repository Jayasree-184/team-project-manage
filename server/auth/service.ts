import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db/prisma";
import { signAccessToken } from "./jwt";
import type { Role } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return {
    token: signAccessToken({ sub: user.id, role: user.role, email: user.email, name: user.name }),
    user: safeUser,
  };
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "A user with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: { name: input.name, email, passwordHash, role: input.role },
    select: publicUserSelect,
  });
}

export async function getCurrentUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { ENV } from "../config/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl() {
  const raw = ENV.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("sslaccept")) url.searchParams.set("sslaccept", "strict");
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  ...(databaseUrl() ? { datasources: { db: { url: databaseUrl() } } } : {}),
  log: ENV.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (ENV.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

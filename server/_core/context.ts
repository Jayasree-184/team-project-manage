import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { prisma } from "../db/prisma";
import { verifyAccessToken } from "../auth/jwt";
import { COOKIE_NAME } from "@shared/const";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER";
  createdAt: Date;
  updatedAt: Date;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

function getToken(req: CreateExpressContextOptions["req"]) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const token = getToken(opts.req);
  if (!token) return { req: opts.req, res: opts.res, user: null };

  const claims = verifyAccessToken(token);
  if (!claims?.sub) return { req: opts.req, res: opts.res, user: null };

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
  return { req: opts.req, res: opts.res, user: user as SessionUser | null };
}

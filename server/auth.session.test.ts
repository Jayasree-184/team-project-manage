import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { publicProcedure, router, trpcHttpStatus } from "./_core/trpc";
import { signAccessToken } from "./auth/jwt";
import { COOKIE_NAME } from "../shared/const";
import { prisma } from "./db/prisma";
import type { TrpcContext } from "./_core/context";

describe("session persistence and error transport", () => {
  it("loads an authenticated user from the HttpOnly session cookie", async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@teammanager.local" } });
    const token = signAccessToken({ sub: admin.id, role: admin.role, email: admin.email, name: admin.name });
    const context = await createContext({
      req: { headers: { cookie: `${COOKIE_NAME}=${encodeURIComponent(token)}` } } as never,
      res: {} as never,
      info: {} as never,
    });
    expect(context.user).toMatchObject({ id: admin.id, role: "ADMIN", email: admin.email });
  });

  it("clears the shared session cookie on logout", async () => {
    const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} },
      res: { clearCookie: (name: string, options: Record<string, unknown>) => cleared.push({ name, options }) },
    } as unknown as TrpcContext;
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared[0]).toMatchObject({ name: COOKIE_NAME, options: { maxAge: -1, httpOnly: true, secure: false, sameSite: "lax" } });
  });

  it("converts an unexpected backend exception into a 500 Internal Server Error", async () => {
    const failureRouter = router({ failureProbe: publicProcedure.query(() => { throw new Error("unexpected failure"); }) });
    await expect(failureRouter.createCaller({ user: null, req: {} as never, res: {} as never }).failureProbe()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(trpcHttpStatus("INTERNAL_SERVER_ERROR")).toBe(500);
  });

  it("exposes the expected HTTP status mapping for auth and server failures", () => {
    expect(trpcHttpStatus("BAD_REQUEST")).toBe(400);
    expect(trpcHttpStatus("UNAUTHORIZED")).toBe(401);
    expect(trpcHttpStatus("FORBIDDEN")).toBe(403);
    expect(trpcHttpStatus("NOT_FOUND")).toBe(404);
    expect(trpcHttpStatus("CONFLICT")).toBe(409);
    expect(trpcHttpStatus("INTERNAL_SERVER_ERROR")).toBe(500);
  });
});

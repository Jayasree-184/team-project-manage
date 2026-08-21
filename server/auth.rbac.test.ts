import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { loginWithPassword } from "./auth/service";
import { verifyAccessToken } from "./auth/jwt";
import { prisma } from "./db/prisma";
import type { TrpcContext } from "./_core/context";

function contextFor(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function user(id: string, role: "ADMIN" | "TEAM_MEMBER", name = role) {
  const now = new Date();
  return { id, name, email: `${role.toLowerCase()}@example.com`, role, createdAt: now, updatedAt: now } as const;
}

describe("authentication and role-based access", () => {
  it("logs in a seeded account using a bcrypt hash and returns verifiable JWT claims without a password hash", async () => {
    const result = await loginWithPassword("admin@teammanager.local", "Admin123!");
    expect(result.user).not.toHaveProperty("passwordHash");
    const claims = verifyAccessToken(result.token);
    expect(claims).toMatchObject({ sub: result.user.id, role: "ADMIN", email: result.user.email });
  });

  it("rejects invalid credentials with UNAUTHORIZED", async () => {
    await expect(loginWithPassword("admin@teammanager.local", "wrong-password")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated access with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tasks.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows Admin project management and rejects Team Member Admin-only operations", async () => {
    const adminCaller = appRouter.createCaller(contextFor(user("missing-admin", "ADMIN")));
    const memberCaller = appRouter.createCaller(contextFor(user("missing-member", "TEAM_MEMBER")));
    await expect(adminCaller.projects.get({ projectId: "missing-project" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(memberCaller.projects.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(memberCaller.team.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(memberCaller.activity.recent()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(memberCaller.projects.create({ name: "Unauthorized project", description: "Must be rejected by backend RBAC" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces task scope for a real seeded Team Member", async () => {
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@teammanager.local" } });
    const assigned = await prisma.task.findFirstOrThrow({ where: { assigneeId: member.id } });
    const caller = appRouter.createCaller(contextFor({ id: member.id, name: member.name, email: member.email, role: member.role, createdAt: member.createdAt, updatedAt: member.updatedAt }));
    const tasks = await caller.tasks.list();
    expect(tasks.every(task => task.assigneeId === member.id)).toBe(true);
    await expect(caller.tasks.get({ taskId: "not-assigned-task" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await caller.tasks.get({ taskId: assigned.id })).assigneeId).toBe(member.id);
  });

  it("returns validation errors for malformed protected inputs", async () => {
    const caller = appRouter.createCaller(contextFor(user("admin", "ADMIN")));
    await expect(caller.tasks.updateStatus({ taskId: "x", status: "INVALID" as never })).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.tasks.get({ taskId: "missing-task" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

import { describe, expect, it } from "vitest";
import { appRouter, progressFor } from "./routers";
import { createTaskSchema, updateTaskStatusSchema } from "./validators";
import type { TrpcContext } from "./_core/context";
import { applicationErrorCode } from "./_core/trpc";
import { ZodError } from "zod";

function contextWithRole(role: "ADMIN" | "TEAM_MEMBER"): TrpcContext {
  const now = new Date();
  return { user: { id: "test-user", name: "Test User", email: "test@example.com", role, createdAt: now, updatedAt: now }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("feature contracts", () => {
  it("calculates project progress from COMPLETED tasks", () => {
    expect(progressFor([])).toBe(0);
    expect(progressFor([{ status: "COMPLETED" }, { status: "IN_PROGRESS" }, { status: "COMPLETED" }])).toBe(67);
  });

  it("maps schema failures to VALIDATION_ERROR", () => {
    const failure = new ZodError([]);
    expect(applicationErrorCode(failure)).toBe("VALIDATION_ERROR");
  });

  it("accepts only the exact status and priority labels", () => {
    expect(updateTaskStatusSchema.parse({ taskId: "task-1", status: "IN_PROGRESS" }).status).toBe("IN_PROGRESS");
    expect(() => updateTaskStatusSchema.parse({ taskId: "task-1", status: "IN PROGRESS" })).toThrow();
    expect(() => createTaskSchema.parse({ projectId: "p", title: "t", priority: "CRITICAL" })).toThrow();
  });

  it("rejects a Team Member before an Admin-only project query reaches data access", async () => {
    const caller = appRouter.createCaller(contextWithRole("TEAM_MEMBER"));
    await expect(caller.projects.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

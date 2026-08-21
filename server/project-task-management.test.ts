import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createProjectSchema, createTaskSchema, listProjectsSchema, listTasksSchema } from "./validators";
import { prisma } from "./db/prisma";

function adminContext(): TrpcContext {
  const now = new Date();
  return {
    user: { id: "test-admin", name: "Test Admin", email: "admin@example.com", role: "ADMIN", createdAt: now, updatedAt: now },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function memberContext(user: { id: string; name: string; email: string; createdAt: Date; updatedAt: Date }): TrpcContext {
  return { ...adminContext(), user: { ...user, role: "TEAM_MEMBER" } };
}

describe("project and task management contracts", () => {
  it("accepts project date/status inputs and rejects invalid date ranges", () => {
    const parsed = createProjectSchema.parse({ name: "Launch", startDate: "2026-08-01", endDate: "2026-08-31", status: "ACTIVE" });
    expect(parsed.status).toBe("ACTIVE");
    expect(() => createProjectSchema.parse({ name: "Launch", startDate: "2026-09-01", endDate: "2026-08-31" })).toThrow();
  });

  it("accepts task search and all required filters", () => {
    expect(listProjectsSchema.parse({ search: "Atlas", status: "ACTIVE" })).toEqual({ search: "Atlas", status: "ACTIVE" });
    expect(listTasksSchema.parse({ search: "workspace", projectId: "project-1", status: "IN_PROGRESS", priority: "HIGH", assigneeId: "member-1" })).toMatchObject({ search: "workspace", projectId: "project-1", status: "IN_PROGRESS", priority: "HIGH", assigneeId: "member-1" });
  });

  it("scopes the Team Member dashboard to assigned tasks and protects it", async () => {
    const member = await prisma.user.findFirstOrThrow({ where: { role: "TEAM_MEMBER" } });
    const caller = appRouter.createCaller(memberContext({ id: member.id, name: member.name, email: member.email, createdAt: member.createdAt, updatedAt: member.updatedAt }));
    const overview = await caller.memberDashboard.overview();
    expect(overview.stats).toEqual(expect.objectContaining({ total: expect.any(Number), today: expect.any(Number), highPriority: expect.any(Number), inProgress: expect.any(Number), completed: expect.any(Number), overdue: expect.any(Number) }));
    expect(overview.tasks.every(task => task.assigneeId === member.id)).toBe(true);
    const unauthenticated = appRouter.createCaller({ ...adminContext(), user: null });
    await expect(unauthenticated.memberDashboard.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("hides assigned tasks that belong to archived projects from Team Members", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const member = await prisma.user.findFirstOrThrow({ where: { role: "TEAM_MEMBER" } });
    const project = await prisma.project.create({ data: { name: `Archived visibility ${Date.now()}`, description: "QA fixture", status: "ARCHIVED", createdById: admin.id } });
    const task = await prisma.task.create({ data: { projectId: project.id, createdById: admin.id, assigneeId: member.id, title: "Archived assigned task", description: "Should not be visible", priority: "HIGH", status: "TODO" } });
    try {
      const memberCaller = appRouter.createCaller(memberContext({ id: member.id, name: member.name, email: member.email, createdAt: member.createdAt, updatedAt: member.updatedAt }));
      const tasks = await memberCaller.tasks.list();
      const overview = await memberCaller.memberDashboard.overview();
      expect(tasks.some(candidate => candidate.id === task.id)).toBe(false);
      expect(overview.tasks.some(candidate => candidate.id === task.id)).toBe(false);
      await expect(memberCaller.tasks.get({ taskId: task.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await prisma.task.deleteMany({ where: { id: task.id } });
      await prisma.project.deleteMany({ where: { id: project.id } });
    }
  });

  it("returns database-backed Admin Dashboard aggregates and activity registers", async () => {
    const caller = appRouter.createCaller(adminContext());
    const overview = await caller.dashboard.overview();
    expect(overview.stats).toEqual(expect.objectContaining({ totalProjects: expect.any(Number), activeProjects: expect.any(Number), totalTasks: expect.any(Number), completedTasks: expect.any(Number), overdueTasks: expect.any(Number), teamMembers: expect.any(Number) }));
    expect(Array.isArray(overview.projects)).toBe(true);
    expect(Array.isArray(overview.tasks)).toBe(true);
    expect(Array.isArray(overview.activities)).toBe(true);
    expect(Array.isArray(overview.deadlineHistory)).toBe(true);
    const member = await prisma.user.findFirstOrThrow({ where: { role: "TEAM_MEMBER" } });
    const memberCaller = appRouter.createCaller(memberContext({ id: member.id, name: member.name, email: member.email, createdAt: member.createdAt, updatedAt: member.updatedAt }));
    await expect(memberCaller.dashboard.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("loads backend project and task registers for an Admin", async () => {
    const caller = appRouter.createCaller(adminContext());
    const projects = await caller.projects.list({ search: "Atlas" });
    expect(Array.isArray(projects)).toBe(true);
    const tasks = await caller.tasks.list({ search: "workspace", priority: "HIGH" });
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.every(task => task.priority === "HIGH" && task.title.toLowerCase().includes("workspace"))).toBe(true);
  });

  it("returns NOT_FOUND for missing project and task detail/deletion targets", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.projects.get({ projectId: "missing-project" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.projects.delete({ projectId: "missing-project" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.tasks.get({ taskId: "missing-task" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.tasks.delete({ taskId: "missing-task" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("covers successful project/task create, detail, assignment, update, and deletion paths", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const member = await prisma.user.findFirstOrThrow({ where: { role: "TEAM_MEMBER" } });
    const caller = appRouter.createCaller({ ...adminContext(), user: { id: admin.id, name: admin.name, email: admin.email, role: "ADMIN", createdAt: admin.createdAt, updatedAt: admin.updatedAt } });
    const project = await caller.projects.create({ name: `Test Project ${Date.now()}`, description: "Temporary management test", status: "PLANNING" });
    try {
      expect(project.name).toContain("Test Project");
      const firstDeadline = new Date("2026-08-25T12:00:00.000Z");
      const secondDeadline = new Date("2026-08-30T12:00:00.000Z");
      const task = await caller.tasks.create({ projectId: project.id, title: "Test assignment", description: "Temporary task", priority: "HIGH", status: "TODO", assigneeId: member.id, deadline: firstDeadline });
      expect(task.assignee?.id).toBe(member.id);
      const detail = await caller.projects.get({ projectId: project.id });
      expect(detail.tasks[0]?.id).toBe(task.id);
      const updated = await caller.tasks.update({ taskId: task.id, priority: "URGENT", assigneeId: member.id, status: "IN_PROGRESS" });
      expect(updated.priority).toBe("URGENT");
      expect(updated.status).toBe("IN_PROGRESS");
      const firstChange = await caller.tasks.update({ taskId: task.id, deadline: secondDeadline, reason: "Client delivery moved" });
      expect(firstChange.deadline?.toISOString()).toBe(secondDeadline.toISOString());
      const historyAfterChange = await caller.tasks.deadlineHistory({ taskId: task.id });
      expect(historyAfterChange).toHaveLength(1);
      expect(historyAfterChange[0]).toMatchObject({ previousDeadline: firstDeadline, newDeadline: secondDeadline, reason: "Client delivery moved" });
      await caller.tasks.update({ taskId: task.id, deadline: secondDeadline, reason: "Duplicate should not be recorded" });
      await expect(caller.tasks.deadlineHistory({ taskId: task.id })).resolves.toHaveLength(1);
      const thirdDeadline = new Date("2026-09-02T12:00:00.000Z");
      await caller.tasks.update({ taskId: task.id, deadline: thirdDeadline, reason: "Final delivery confirmation" });
      const orderedHistory = await caller.tasks.deadlineHistory({ taskId: task.id });
      expect(orderedHistory).toHaveLength(2);
      expect(orderedHistory[0]!.changedAt.getTime()).toBeLessThanOrEqual(orderedHistory[1]!.changedAt.getTime());
      expect(orderedHistory[1]!.reason).toBe("Final delivery confirmation");
      const memberCaller = appRouter.createCaller(memberContext({ id: member.id, name: member.name, email: member.email, createdAt: member.createdAt, updatedAt: member.updatedAt }));
      await expect(memberCaller.tasks.deadlineHistory({ taskId: task.id })).resolves.toHaveLength(2);
      const unassignedTask = await caller.tasks.create({ projectId: project.id, title: "Unassigned history access test", description: "Temporary authorization fixture", priority: "LOW", status: "TODO" });
      await expect(memberCaller.tasks.deadlineHistory({ taskId: unassignedTask.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await caller.tasks.delete({ taskId: unassignedTask.id });
      const taskDetail = await caller.tasks.get({ taskId: task.id });
      expect(taskDetail.id).toBe(task.id);
      await caller.tasks.delete({ taskId: task.id });
      await expect(caller.tasks.get({ taskId: task.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
      await caller.projects.delete({ projectId: project.id });
      await expect(caller.projects.get({ projectId: project.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await prisma.project.deleteMany({ where: { id: project.id } });
    }
  }, 45_000);

  it("maps unexpected deadline-history database failures to Internal Server Error", async () => {
    const seededTask = await prisma.task.findFirstOrThrow();
    const failure = vi.spyOn(prisma.deadlineHistory, "findMany").mockRejectedValueOnce(new Error("history database unavailable"));
    try {
      const caller = appRouter.createCaller(adminContext());
      await expect(caller.tasks.deadlineHistory({ taskId: seededTask.id })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    } finally {
      failure.mockRestore();
    }
  });

  it("rejects invalid, missing, and unauthenticated deadline-history requests", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.tasks.deadlineHistory({ taskId: "" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.tasks.deadlineHistory({ taskId: "missing-task" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const unauthenticated = appRouter.createCaller({ ...adminContext(), user: null });
    await expect(unauthenticated.tasks.deadlineHistory({ taskId: "missing-task" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects invalid create payloads before data access", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.projects.create({ name: "x" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.tasks.create({ projectId: "project-1", title: "x", priority: "CRITICAL" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

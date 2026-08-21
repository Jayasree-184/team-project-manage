import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db/prisma";
import { createUser, loginWithPassword, publicUserSelect } from "./auth/service";
import { protectedProcedure, publicProcedure, adminProcedure, router } from "./_core/trpc";
import {
  createCommentSchema, createMemberSchema, createProjectSchema, createTaskSchema, dashboardOverviewSchema, deleteProjectSchema,
  deleteTaskSchema, listProjectsSchema, listTasksSchema, loginSchema, projectIdSchema, taskIdSchema,
  updateProjectSchema, updateTaskSchema, updateTaskStatusSchema,
} from "./validators";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./config/env";

const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: ENV.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 2, path: "/" };
const taskInclude = {
  project: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
  assignee: { select: publicUserSelect },
  createdBy: { select: publicUserSelect },
  _count: { select: { comments: true, deadlineHistory: true } },
} as const;

type ActivityType = "PROJECT_CREATED" | "PROJECT_UPDATED" | "PROJECT_ARCHIVED" | "TASK_CREATED" | "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "TASK_COMMENTED" | "DEADLINE_CHANGED";

function assertAssigned(task: { assigneeId: string | null }, userId: string) {
  if (task.assigneeId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "You can only access tasks assigned to you." });
}

async function recordActivity(input: { type: ActivityType; message: string; actorId: string; projectId?: string; taskId?: string }) {
  await prisma.activity.create({ data: input });
}

export function progressFor(tasks: Array<{ status: string }>) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(task => task.status === "COMPLETED").length / tasks.length) * 100);
}

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, service: "team-project-manager" })),
  auth: router({
    login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
      const result = await loginWithPassword(input.email, input.password);
      ctx.res.cookie(COOKIE_NAME, result.token, sessionCookieOptions);
      return { user: result.user };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...sessionCookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    me: protectedProcedure.query(({ ctx }) => ctx.user),
  }),
  memberDashboard: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date();
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
      const assigned = { assigneeId: ctx.user.id, project: { status: { not: "ARCHIVED" as const } } };
      const [tasks, total, today, highPriority, inProgress, completed, overdue] = await Promise.all([
        prisma.task.findMany({ where: assigned, include: taskInclude, orderBy: [{ deadline: "asc" }, { updatedAt: "desc" }] }),
        prisma.task.count({ where: assigned }),
        prisma.task.count({ where: { ...assigned, deadline: { gte: startOfToday, lt: startOfTomorrow }, status: { not: "COMPLETED" } } }),
        prisma.task.count({ where: { ...assigned, priority: { in: ["HIGH", "URGENT"] }, status: { not: "COMPLETED" } } }),
        prisma.task.count({ where: { ...assigned, status: "IN_PROGRESS" } }),
        prisma.task.count({ where: { ...assigned, status: "COMPLETED" } }),
        prisma.task.count({ where: { ...assigned, deadline: { lt: now }, status: { not: "COMPLETED" } } }),
      ]);
      return { stats: { total, today, highPriority, inProgress, completed, overdue }, tasks };
    }),
  }),
  dashboard: router({
    overview: adminProcedure.input(dashboardOverviewSchema).query(async ({ input }) => {
      const now = new Date();
      const projectWhere: Prisma.ProjectWhereInput = { status: input?.projectStatus ?? { not: "ARCHIVED" }, ...(input?.projectSearch ? { OR: [{ name: { contains: input.projectSearch } }, { description: { contains: input.projectSearch } }] } : {}) };
      const taskWhere: Prisma.TaskWhereInput = { project: { status: { not: "ARCHIVED" } }, ...(input?.taskStatus ? { status: input.taskStatus } : {}), ...(input?.taskSearch ? { OR: [{ title: { contains: input.taskSearch } }, { description: { contains: input.taskSearch } }, { project: { name: { contains: input.taskSearch } } }] } : {}) };
      const [totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, teamMembers, projects, tasks, activities, deadlineHistory] = await Promise.all([
        prisma.project.count({ where: { status: { not: "ARCHIVED" } } }),
        prisma.project.count({ where: { status: "ACTIVE" } }),
        prisma.task.count({ where: { project: { status: { not: "ARCHIVED" } } } }),
        prisma.task.count({ where: { status: "COMPLETED", project: { status: { not: "ARCHIVED" } } } }),
        prisma.task.count({ where: { deadline: { lt: now }, status: { not: "COMPLETED" }, project: { status: { not: "ARCHIVED" } } } }),
        prisma.user.count({ where: { role: "TEAM_MEMBER" } }),
        prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: "desc" }, include: { tasks: { select: { status: true } } } }),
        prisma.task.findMany({ where: taskWhere, orderBy: { updatedAt: "desc" }, include: taskInclude }),
        prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: publicUserSelect }, project: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } } }),
        prisma.deadlineHistory.findMany({ orderBy: { changedAt: "desc" }, take: 8, include: { task: { select: { id: true, title: true, project: { select: { name: true } } } }, changedByUser: { select: publicUserSelect } } }),
      ]);
      return {
        stats: { totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, teamMembers },
        projects: projects.map(project => ({ ...project, progress: progressFor(project.tasks), taskCount: project.tasks.length, tasks: undefined })),
        tasks,
        activities,
        deadlineHistory,
      };
    }),
  }),
  team: router({
    list: adminProcedure.query(() => prisma.user.findMany({ where: { role: "TEAM_MEMBER" }, select: publicUserSelect, orderBy: { name: "asc" } })),
    create: adminProcedure.input(createMemberSchema).mutation(({ input }) => createUser({ ...input, role: "TEAM_MEMBER" })),
  }),
  projects: router({
    list: adminProcedure.input(listProjectsSchema.optional()).query(async ({ input }) => {
      const projects = await prisma.project.findMany({
        where: {
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.search ? { OR: [{ name: { contains: input.search } }, { description: { contains: input.search } }] } : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { tasks: true } }, tasks: { select: { status: true } } },
      });
      return projects.map(project => ({ ...project, progress: progressFor(project.tasks), taskCount: project._count.tasks, tasks: undefined, _count: undefined }));
    }),
    get: adminProcedure.input(projectIdSchema).query(async ({ input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        include: { tasks: { include: taskInclude, orderBy: { updatedAt: "desc" } }, createdBy: { select: publicUserSelect } },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      return { ...project, progress: progressFor(project.tasks) };
    }),
    create: adminProcedure.input(createProjectSchema).mutation(async ({ input, ctx }) => {
      const project = await prisma.project.create({ data: { ...input, createdById: ctx.user.id } });
      await recordActivity({ type: "PROJECT_CREATED", message: `Created project ${project.name}`, actorId: ctx.user.id, projectId: project.id });
      return project;
    }),
    update: adminProcedure.input(updateProjectSchema).mutation(async ({ input, ctx }) => {
      const { projectId, ...data } = input;
      const existing = await prisma.project.findUnique({ where: { id: projectId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const startDate = data.startDate === undefined ? existing.startDate : data.startDate;
      const endDate = data.endDate === undefined ? existing.endDate : data.endDate;
      if (startDate && endDate && endDate < startDate) throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be on or after the start date." });
      const project = await prisma.project.update({ where: { id: projectId }, data });
      await recordActivity({ type: project.status === "ARCHIVED" ? "PROJECT_ARCHIVED" : "PROJECT_UPDATED", message: `Updated project ${project.name}`, actorId: ctx.user.id, projectId: project.id });
      return project;
    }),
    delete: adminProcedure.input(deleteProjectSchema).mutation(async ({ input, ctx }) => {
      const existing = await prisma.project.findUnique({ where: { id: input.projectId }, include: { tasks: { select: { id: true } } } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      await prisma.$transaction(async transaction => {
        const taskIds = existing.tasks.map(task => task.id);
        if (taskIds.length) {
          await transaction.comment.deleteMany({ where: { taskId: { in: taskIds } } });
          await transaction.deadlineHistory.deleteMany({ where: { taskId: { in: taskIds } } });
          await transaction.activity.deleteMany({ where: { taskId: { in: taskIds } } });
          await transaction.task.deleteMany({ where: { id: { in: taskIds } } });
        }
        await transaction.activity.deleteMany({ where: { projectId: input.projectId } });
        await transaction.project.delete({ where: { id: input.projectId } });
      });
      return { success: true, projectId: input.projectId, deletedBy: ctx.user.id } as const;
    }),
  }),
  tasks: router({
    list: protectedProcedure.input(listTasksSchema.optional()).query(async ({ input, ctx }) => {
      const where = {
        ...(ctx.user.role === "TEAM_MEMBER" ? { assigneeId: ctx.user.id, project: { status: { not: "ARCHIVED" as const } } } : {}),
        ...(ctx.user.role === "ADMIN" && input?.assigneeId ? { assigneeId: input.assigneeId } : {}),
        ...(input?.projectId ? { projectId: input.projectId } : {}),
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.priority ? { priority: input.priority } : {}),
        ...(input?.search ? { OR: [{ title: { contains: input.search } }, { description: { contains: input.search } }] } : {}),
      };
      return prisma.task.findMany({ where, include: taskInclude, orderBy: [{ deadline: "asc" }, { updatedAt: "desc" }] });
    }),
    get: protectedProcedure.input(taskIdSchema).query(async ({ input, ctx }) => {
      const task = await prisma.task.findUnique({ where: { id: input.taskId }, include: { ...taskInclude, comments: { include: { author: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } }, deadlineHistory: { include: { changedByUser: { select: publicUserSelect } }, orderBy: { changedAt: "asc" } }, activities: { include: { actor: { select: publicUserSelect } }, orderBy: { createdAt: "desc" } } } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      if (ctx.user.role === "TEAM_MEMBER") {
        assertAssigned(task, ctx.user.id);
        if (task.project.status === "ARCHIVED") throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }
      return task;
    }),
    create: adminProcedure.input(createTaskSchema).mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project || project.status === "ARCHIVED") throw new TRPCError({ code: "NOT_FOUND", message: "Active project not found." });
      if (input.assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: input.assigneeId } });
        if (!assignee || assignee.role !== "TEAM_MEMBER") throw new TRPCError({ code: "CONFLICT", message: "Tasks can only be assigned to Team Members." });
      }
      const task = await prisma.task.create({ data: { ...input, createdById: ctx.user.id }, include: taskInclude });
      await recordActivity({ type: "TASK_CREATED", message: `Created task ${task.title}`, actorId: ctx.user.id, projectId: task.projectId, taskId: task.id });
      if (input.assigneeId) await recordActivity({ type: "TASK_ASSIGNED", message: `Assigned task ${task.title}`, actorId: ctx.user.id, projectId: task.projectId, taskId: task.id });
      return task;
    }),
    update: adminProcedure.input(updateTaskSchema).mutation(async ({ input, ctx }) => {
      const { taskId, reason, ...data } = input;
      const existing = await prisma.task.findUnique({ where: { id: taskId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      if (data.assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
        if (!assignee || assignee.role !== "TEAM_MEMBER") throw new TRPCError({ code: "CONFLICT", message: "Tasks can only be assigned to Team Members." });
      }
      const deadlineChanged = Object.prototype.hasOwnProperty.call(data, "deadline") && data.deadline?.getTime() !== existing.deadline?.getTime();
      const task = await prisma.$transaction(async transaction => {
        const updated = await transaction.task.update({ where: { id: taskId }, data, include: taskInclude });
        if (deadlineChanged) {
          await transaction.deadlineHistory.create({ data: { taskId, previousDeadline: existing.deadline, newDeadline: data.deadline ?? null, changedBy: ctx.user.id, reason: reason?.trim() || null } });
          await transaction.activity.create({ data: { type: "DEADLINE_CHANGED", message: `Changed deadline for ${existing.title}`, actorId: ctx.user.id, projectId: existing.projectId, taskId } });
        }
        return updated;
      });
      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) await recordActivity({ type: "TASK_ASSIGNED", message: `Updated assignment for ${task.title}`, actorId: ctx.user.id, projectId: task.projectId, taskId: task.id });
      return task;
    }),
    delete: adminProcedure.input(deleteTaskSchema).mutation(async ({ input, ctx }) => {
      const existing = await prisma.task.findUnique({ where: { id: input.taskId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      await prisma.$transaction(async transaction => {
        await transaction.comment.deleteMany({ where: { taskId: input.taskId } });
        await transaction.deadlineHistory.deleteMany({ where: { taskId: input.taskId } });
        await transaction.activity.deleteMany({ where: { taskId: input.taskId } });
        await transaction.task.delete({ where: { id: input.taskId } });
      });
      return { success: true, taskId: input.taskId, deletedBy: ctx.user.id } as const;
    }),
    updateStatus: protectedProcedure.input(updateTaskStatusSchema).mutation(async ({ input, ctx }) => {
      const existing = await prisma.task.findUnique({ where: { id: input.taskId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      if (ctx.user.role === "TEAM_MEMBER") assertAssigned(existing, ctx.user.id);
      const task = await prisma.task.update({ where: { id: input.taskId }, data: { status: input.status }, include: taskInclude });
      await recordActivity({ type: "TASK_STATUS_CHANGED", message: `Changed status of ${task.title} to ${task.status}`, actorId: ctx.user.id, projectId: task.projectId, taskId: task.id });
      return task;
    }),
    comments: protectedProcedure.input(taskIdSchema).query(async ({ input, ctx }) => {
      const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { assigneeId: true } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      if (ctx.user.role === "TEAM_MEMBER") assertAssigned(task, ctx.user.id);
      return prisma.comment.findMany({ where: { taskId: input.taskId }, include: { author: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } });
    }),
    addComment: protectedProcedure.input(createCommentSchema).mutation(async ({ input, ctx }) => {
      const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { id: true, title: true, projectId: true, assigneeId: true } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      if (ctx.user.role === "TEAM_MEMBER") assertAssigned(task, ctx.user.id);
      const comment = await prisma.comment.create({ data: { taskId: input.taskId, authorId: ctx.user.id, body: input.body }, include: { author: { select: publicUserSelect } } });
      await recordActivity({ type: "TASK_COMMENTED", message: `Added a progress update to ${task.title}`, actorId: ctx.user.id, projectId: task.projectId, taskId: task.id });
      return comment;
    }),
    deadlineHistory: protectedProcedure.input(taskIdSchema).query(async ({ input, ctx }) => {
      const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { id: true, assigneeId: true } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      if (ctx.user.role === "TEAM_MEMBER") assertAssigned(task, ctx.user.id);
      return prisma.deadlineHistory.findMany({ where: { taskId: input.taskId }, include: { changedByUser: { select: publicUserSelect } }, orderBy: { changedAt: "asc" } });
    }),
  }),
  activity: router({ recent: adminProcedure.input(taskIdSchema.optional()).query(({ input }) => prisma.activity.findMany({ where: input?.taskId ? { taskId: input.taskId } : undefined, include: { actor: { select: publicUserSelect } }, orderBy: { createdAt: "desc" }, take: 30 })) }),
});

export type AppRouter = typeof appRouter;

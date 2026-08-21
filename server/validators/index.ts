import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "TEAM_MEMBER"]);
export const projectStatusSchema = z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);
export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const id = z.string().trim().min(1, "Identifier is required.");
const dateInput = z.coerce.date().refine(value => !Number.isNaN(value.getTime()), "Invalid date.");
const optionalDate = dateInput.optional().nullable();

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export const projectIdSchema = z.object({ projectId: id });
export const taskIdSchema = z.object({ taskId: id });

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).default(""),
  startDate: optionalDate,
  endDate: optionalDate,
  status: projectStatusSchema.default("PLANNING"),
}).refine(value => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: "End date must be on or after the start date.",
  path: ["endDate"],
});

export const updateProjectSchema = z.object({
  projectId: id,
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  status: projectStatusSchema.optional(),
}).refine(value => Object.keys(value).some(key => key !== "projectId"), "At least one field is required.");

export const createTaskSchema = z.object({
  projectId: id,
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).default(""),
  assigneeId: id.optional().nullable(),
  priority: taskPrioritySchema.default("MEDIUM"),
  status: taskStatusSchema.default("TODO"),
  deadline: optionalDate,
});

export const updateTaskSchema = z.object({
  taskId: id,
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  assigneeId: id.optional().nullable(),
  priority: taskPrioritySchema.optional(),
  deadline: optionalDate,
  reason: z.string().trim().max(500).optional(),
  status: taskStatusSchema.optional(),
}).refine(value => Object.keys(value).some(key => key !== "taskId"), "At least one field is required.");

export const updateTaskStatusSchema = z.object({ taskId: id, status: taskStatusSchema });
export const createCommentSchema = z.object({ taskId: id, body: z.string().trim().min(1).max(5000) });

export const listTasksSchema = z.object({
  projectId: id.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: id.optional(),
  search: z.string().trim().max(120).optional(),
});

export const listProjectsSchema = z.object({
  status: projectStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

export const dashboardOverviewSchema = z.object({
  projectSearch: z.string().trim().max(120).optional(),
  projectStatus: projectStatusSchema.optional(),
  taskSearch: z.string().trim().max(120).optional(),
  taskStatus: taskStatusSchema.optional(),
}).optional();

export const deleteProjectSchema = projectIdSchema;
export const deleteTaskSchema = taskIdSchema;

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

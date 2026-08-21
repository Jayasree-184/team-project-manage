import bcrypt from "bcryptjs";
import { PrismaClient, Role, ProjectStatus, TaskPriority, TaskStatus, ActivityType } from "@prisma/client";

const rawUrl = process.env.DATABASE_URL;
const databaseUrl = rawUrl ? (() => { const url = new URL(rawUrl); if (!url.searchParams.has("sslaccept")) url.searchParams.set("sslaccept", "strict"); return url.toString(); })() : undefined;
const prisma = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);

async function main() {
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const memberPassword = await bcrypt.hash("Member123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@teammanager.local" },
    update: { name: "Alex Morgan", role: Role.ADMIN, passwordHash: adminPassword },
    create: { name: "Alex Morgan", email: "admin@teammanager.local", role: Role.ADMIN, passwordHash: adminPassword },
  });
  const member = await prisma.user.upsert({
    where: { email: "member@teammanager.local" },
    update: { name: "Jordan Lee", role: Role.TEAM_MEMBER, passwordHash: memberPassword },
    create: { name: "Jordan Lee", email: "member@teammanager.local", role: Role.TEAM_MEMBER, passwordHash: memberPassword },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-platform" },
    update: { name: "Atlas Platform", description: "A seeded project for the evaluator walkthrough.", status: ProjectStatus.ACTIVE },
    create: { id: "seed-project-platform", name: "Atlas Platform", description: "A seeded project for the evaluator walkthrough.", createdById: admin.id },
  });

  const existingTask = await prisma.task.findFirst({ where: { projectId: project.id, title: "Build task workspace" } });
  const task = existingTask ?? await prisma.task.create({
    data: { projectId: project.id, createdById: admin.id, assigneeId: member.id, title: "Build task workspace", description: "Review the task detail, update status, and add a progress update.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) },
  });

  await prisma.comment.upsert({ where: { id: "seed-comment-progress" }, update: { body: "Workspace foundation is in progress.", taskId: task.id, authorId: member.id }, create: { id: "seed-comment-progress", taskId: task.id, authorId: member.id, body: "Workspace foundation is in progress." } });
  await prisma.activity.upsert({ where: { id: "seed-activity-project" }, update: { message: "Seeded Atlas Platform project", actorId: admin.id, projectId: project.id, type: ActivityType.PROJECT_CREATED }, create: { id: "seed-activity-project", message: "Seeded Atlas Platform project", actorId: admin.id, projectId: project.id, type: ActivityType.PROJECT_CREATED } });
  await prisma.activity.upsert({ where: { id: "seed-activity-task" }, update: { message: "Assigned task workspace to Jordan Lee", actorId: admin.id, projectId: project.id, taskId: task.id, type: ActivityType.TASK_ASSIGNED }, create: { id: "seed-activity-task", message: "Assigned task workspace to Jordan Lee", actorId: admin.id, projectId: project.id, taskId: task.id, type: ActivityType.TASK_ASSIGNED } });

  const historyCount = await prisma.deadlineHistory.count({ where: { taskId: task.id } });
  if (historyCount === 0) {
    await prisma.deadlineHistory.create({ data: { taskId: task.id, previousDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), newDeadline: task.deadline, changedBy: admin.id, reason: "Client delivery moved" } });
  } else {
    await prisma.deadlineHistory.updateMany({ where: { taskId: task.id, reason: null }, data: { reason: "Client delivery moved" } });
  }

  console.log("Seeded demo accounts:");
  console.log("Admin: admin@teammanager.local / Admin123!");
  console.log("Team Member: member@teammanager.local / Member123!");
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());

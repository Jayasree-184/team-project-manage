# Database Documentation

## Provider and connection

The Prisma datasource uses the MySQL provider because the managed runtime supplies a MySQL-compatible TiDB database. `DATABASE_URL` is the only required Prisma connection variable and should be supplied through the local environment or hosting secret manager. The repository does not contain a database credential.

## Entities

| Entity | Purpose | Important relationships |
|---|---|---|
| `app_users` | Authenticated operators and role records. | Creates projects/tasks, receives assignments, authors comments, changes deadlines, and creates activity. |
| `projects` | Work containers with lifecycle status and date metadata. | Belongs to a creator and contains tasks/activity. |
| `tasks` | Assignable units of work with status, priority, and optional deadline. | Belongs to a project and creator; may have an assignee, comments, deadline history, and activity. |
| `comments` | Progress updates and task discussion. | Belongs to a task and author. |
| `deadline_history` | Append-only deadline audit records. | Belongs to a task and the user who changed the deadline. |
| `activities` | Operational event timeline. | Belongs to an actor and optionally a project/task. |

## Enumerations

`Role` contains `ADMIN` and `TEAM_MEMBER`. `ProjectStatus` contains `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, and `ARCHIVED`. `TaskStatus` contains `TODO`, `IN_PROGRESS`, `BLOCKED`, and `COMPLETED`. `TaskPriority` contains `LOW`, `MEDIUM`, `HIGH`, and `URGENT`. Activity types identify project creation/update/archive, task creation/assignment/status changes, comments, and deadline changes.

## Keys and indexes

Every model uses a string CUID primary key. User email is unique. Foreign keys connect all ownership and audit relationships. Indexes support role and creation-time lookup, project status and creator lookup, task project/assignee/status/priority/deadline filtering, comment chronology, deadline-history chronology, and activity timelines by project, task, or actor.

## Deadline-history transaction

When an Admin changes an existing task deadline, the service compares the previous and requested values. If they differ, one Prisma transaction updates the task, inserts a `deadline_history` row containing `previousDeadline`, `newDeadline`, `changedBy`, `changedAt`, and optional `reason`, and writes the related activity event. If the value is unchanged, no duplicate history row is created. The timeline is queried in chronological order for evaluator visibility.

## Visibility rules

Admins can manage the complete active project/task register. Team Members receive only assigned tasks and are additionally prevented from reading tasks whose project is archived. Task detail, comments, activity, and deadline-history procedures repeat the authorization check rather than trusting frontend filtering.

## Migrations and seed

The authoritative schema is `prisma/schema.prisma`. Use `pnpm db:generate` after schema changes. Apply committed migrations with `pnpm db:deploy`, or use `pnpm db:push` for a fresh development database. Run `pnpm db:seed` to create the idempotent demo users and evaluator dataset. Destructive database operations are intentionally not part of the automated test workflow.

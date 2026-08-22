# !\[React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)

# !\[TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)

# !\[Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)

# !\[Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)

# !\[tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)

# !\[Tests](https://img.shields.io/badge/tests-43%20passing-brightgreen)

# !\[License](https://img.shields.io/badge/license-MIT-blue)

# 

\*\*\[Live Demo](https://team-project-manager-5exk.onrender.com)\*\* · \*\*\[API Docs](docs/API.md)\*\* · \*\*\[Database Schema](docs/DATABASE.md)\*\*
Atlas Office — Team Project & Task Manager
===

Atlas Office is a production-oriented full-stack Team Project & Task Management application for coordinating projects, assigning work, tracking progress, and preserving an auditable history of deadline changes. The product combines a functional role-aware application with an editorial brutalist interface and an optional immersive Three.js landing experience.

> \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*Submission note:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\* The application is implemented against the managed MySQL-compatible TiDB database supplied by the runtime. The Prisma provider is therefore `mysql`, even though the service boundaries remain portable to another relational database.

## 1\. Project overview

The application provides two authenticated operating modes. **Admins** manage the project portfolio, task register, team membership, priorities, assignments, deadlines, activity, and deadline history. **Team Members** see only their assigned, non-archived work and can update status, add progress comments, inspect priorities and deadlines, and review task history.

The public root route presents the architectural “Project Control System” experience. The `ENTER DASHBOARD` control performs an in-app transition to the real authentication boundary or the existing dashboard session. Direct routes such as `/login`, `/app`, `/app/projects`, and `/app/tasks` remain available without visiting the landing page.

## 2\. Problem statement

Teams often lose delivery context across spreadsheets, chat messages, and changing due dates. This system centralizes project and task ownership, makes operational status visible, and preserves the historical record behind deadline changes. The result is a single source of truth for who owns work, what state it is in, when it is due, and why the due date changed.

## 3\. Features

|Capability|Implementation|
|-|-|
|Authentication|Email/password login, bcrypt password hashing, JWT session cookies, logout, session persistence, and protected routes.|
|Authorization|Backend-enforced `ADMIN` and `TEAM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_MEMBER` procedures; frontend visibility is not the security boundary.|
|Project management|Admin project creation, editing, archiving, detail views, search, filters, and derived progress.|
|Task management|Task creation, assignment, priority, status, deadline, search, filters, detail views, and deletion/update workflows.|
|Deadline audit|Transactional append-only deadline history with previous deadline, new deadline, actor, timestamp, and optional reason.|
|Collaboration|Authorized task comments and progress updates recorded with activity events.|
|Operations|Activity timelines, project progress, overdue work, team directory, loading/empty/error/success states, and responsive layouts.|
|Experience|Concrete/paper visual system, editorial typography, architectural 3D landing scene, smooth scroll choreography, reduced-motion behavior, and control-terminal dashboard handoff.|
|Security|Origin protection for cookie-authenticated mutations, bounded JSON bodies, security headers, CSP `frame-ancestors` fallback, fail-closed production JWT configuration, and secret-safe templates.|

## 4\. Admin functionality

An Admin can create, read, update, and archive projects; view derived progress; create, edit, delete, assign, and prioritize tasks; change deadlines; manage Team Member accounts; inspect system activity; search and filter the full project/task dataset; and review deadline-history records. These operations are protected by server-side role procedures and are not granted merely because a button is visible.

## 5\. Team Member functionality

A Team Member can access the focused workbench for assigned tasks only. The dashboard includes **My Tasks**, **Today’s Deadlines**, **High Priority**, **In Progress**, **Completed**, and **Overdue** views. Each task exposes its project, priority, status, and deadline. A Team Member can update status, add comments/progress updates, view comments, deadlines, priorities, activities, and deadline history. Tasks in archived projects are excluded from Team Member list, detail, and dashboard reads.

## 6\. Technology stack

|Layer|Technology|
|-|-|
|Frontend|React, TypeScript, Vite, Wouter, Tailwind-compatible CSS, tRPC React client|
|3D|Three.js, React Three Fiber, Drei|
|Backend|Node.js, Express, tRPC|
|Persistence|Prisma ORM with MySQL-compatible TiDB|
|Validation|Zod|
|Authentication|JWT, bcrypt, HttpOnly cookies|
|Testing|Vitest, TypeScript compiler, production Vite/esbuild build|
|Package manager|pnpm|

## 7\. Architecture

The application is a typed tRPC monorepo-style web project. The browser consumes the router through `client/src/lib/trpc.ts`; the server constructs request context in `server/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_core/context.ts`, applies protected and role middleware in `server/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_core/trpc.ts`, and composes feature procedures in `server/routers.ts`. Prisma access is isolated in `server/db.ts` and authentication helpers are isolated under `server/auth/`.

The public landing route is lazy-loaded so the Three.js scene is not part of the authenticated application’s initial JavaScript route. The authenticated shell is shared by the Admin and Team Member pages, while server procedures apply the final authorization decision.

## 8\. Folder structure

```text
client/
  src/
    components/       Shared shell, scene, feedback, and UI primitives
    layouts/          Authenticated application shell
    pages/            Landing, login, dashboard, project, and task pages
    lib/              tRPC client and shared frontend utilities
    index.css         Global editorial/brutalist design system
server/
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_core/              Express, tRPC, context, cookies, runtime integration
  auth/               Password hashing, JWT signing, session helpers
  config/             Environment validation
  validators/         Shared Zod input contracts
  db.ts               Prisma client and query helpers
  routers.ts          Typed API procedures
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*.test.ts           Vitest regression and security coverage
prisma/
  schema.prisma       Authoritative relational schema
  seed.ts              Reproducible demo data
  migrations/         Prisma migration history
docs/
  API.md              Procedure-level API reference
  DATABASE.md         Schema, indexes, transactions, and seed notes
  ER-DIAGRAM.md       Mermaid ER diagram
  SUBMISSION.md       Evaluation and upload checklist
```

## 9\. Database schema and ER diagram

The authoritative schema is [`prisma/schema.prisma`](./prisma/schema.prisma). The primary entities are `User`, `Project`, `Task`, `Comment`, `DeadlineHistory`, and `Activity`. Foreign keys connect project creators, task creators and assignees, comment authors, deadline-change actors, and activity actors to the appropriate records.

The complete diagram is available in [`docs/ER-DIAGRAM.md`](./docs/ER-DIAGRAM.md), and implementation notes including indexes, enums, transaction behavior, and seed records are in [`docs/DATABASE.md`](./docs/DATABASE.md).

## 10\. Authentication

Login is performed through the public `auth.login` procedure. Passwords are compared against bcrypt hashes, and successful authentication creates a signed JWT session cookie with `HttpOnly`, `SameSite=Lax`, `Path=/`, and production-secure behavior. The request context accepts the session cookie and the supported bearer-token form. `auth.me` returns only the public user projection; password hashes are never exposed.

Production refuses to start without an explicit `JWT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_SECRET`. Development and test environments may use an ephemeral in-memory secret when no secret is supplied, but no predictable fallback is used.

## 11\. Role-based authorization

The server exposes protected procedure layers for authentication and role checks. `ADMIN` operations include project/task management and team administration. `TEAM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_MEMBER` operations are scoped to the authenticated assignee. Unauthorized requests return `UNAUTHORIZED`, role violations return `FORBIDDEN`, missing resources return `NOT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_FOUND`, invalid input returns validation errors, and application conflicts serialize as HTTP 409 at the transport boundary.

## 12\. API documentation

The complete procedure matrix, access requirements, input/output notes, error contract, and example tRPC request shape are in [`docs/API.md`](./docs/API.md). The API is mounted below `/api/trpc`; health is available through the public health procedure.

## 13\. Environment variables

Copy [`env-template.txt`](./env-template.txt) to `.env` for local development, then replace placeholders with local or platform-provided values. Never commit `.env`, production credentials, database URLs, JWT secrets, API keys, private keys, or real user passwords. The managed environment may inject additional Manus runtime variables; the template documents their names without values.

## 14\. Installation

The project requires Node.js 20+ and pnpm. Install dependencies and generate the Prisma client:

```bash
pnpm install
pnpm db:generate
```

Configure a MySQL-compatible `DATABASE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_URL` and a long random `JWT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_SECRET` in `.env`. Apply the schema using either the committed migration workflow or the managed database push workflow:

```bash
pnpm db:deploy
# or, for a fresh local development database:
pnpm db:push
```

## 15\. Database setup and seed data

Seed the database after the schema is available:

```bash
pnpm db:seed
```

The seed is idempotent for the demo users and creates a sample Atlas Platform project, an assigned task, comments, activity records, and an initial deadline-history record. Do not run destructive database commands against a shared or production database without a backup and explicit confirmation.

## 16\. Running locally

Start the development server with:

```bash
pnpm dev
```

Open `http://localhost:3000/` for the immersive landing experience. Direct application routes include `/login`, `/app`, `/app/projects`, and `/app/tasks`. The `ENTER DASHBOARD` CTA performs the architectural handoff without a full-page reload.

## 17\. Testing and quality checks

Run the complete verification pipeline before submission:

```bash
pnpm test
pnpm check
pnpm build
```

The repository includes regression coverage for authentication, logout, session persistence, JWT tampering, RBAC, validation and error mapping, project/task management, Team Member scoping, deadline-history transactions, comments, landing transitions, UI contracts, security hardening, and archived-project visibility. The latest QA run passed
**43 tests across 11 Vitest files**
18. Deployment

The project is compatible with the managed WebDev hosting environment. Create a checkpoint before publishing and use the platform’s Publish workflow. Provide production `DATABASE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_URL`, `JWT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_SECRET`, `CLIENT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ORIGIN`, and the required platform/OAuth variables through the hosting environment, never through committed source files. A conventional Node deployment can use `pnpm build` followed by `pnpm start`, provided the runtime supplies the same environment contract and a reachable MySQL-compatible database.

## 19\. Demo credentials

These are seeded non-production evaluator credentials only:

|Role|Email|Password|
|-|-|-|
|Admin|`admin@teammanager.local`|`Admin123!`|
|Team Member|`member@teammanager.local`|`Member123!`|

Rotate or remove these accounts before any real deployment. They must not be reused for production access.

## 20\. Screenshots and visual verification

The public landing and responsive application surfaces are available from the running preview URL supplied by the project environment. The visual system uses an off-white concrete/paper canvas, black editorial typography, heavy rectangular rules, a restrained oxidized-orange accent, monospace metadata, asymmetrical grids, and reduced-motion fallbacks. Representative browser verification covers the landing, login, protected shell, Admin workflows, and Team Member workbench. The internal QA evidence is summarized in [`qa-security-report.md`](./qa-security-report.md).

## 21\. Future improvements

The most practical next improvements are automated browser coverage for destructive confirmation flows, exportable activity and deadline-history reports, notification delivery for approaching deadlines, and further Three.js dependency optimization if landing-page performance measurements justify it.

## Submission references

|Artifact|Location|
|-|-|
|API reference|[`docs/API.md`](./docs/API.md)|
|Database documentation|[`docs/DATABASE.md`](./docs/DATABASE.md)|
|ER diagram|[`docs/ER-DIAGRAM.md`](./docs/ER-DIAGRAM.md)|
|Submission checklist|[`docs/SUBMISSION.md`](./docs/SUBMISSION.md)|
|Environment template|[`env-template.txt`](./env-template.txt)|
|Prisma schema|[`prisma/schema.prisma`](./prisma/schema.prisma)|
|Seed script|[`prisma/seed.ts`](./prisma/seed.ts)|




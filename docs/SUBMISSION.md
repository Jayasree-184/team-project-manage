# Submission Checklist

This document is the final handoff checklist for the Team Project & Task Management assignment.

## Required artifacts

- [x] Complete source code under `client/`, `server/`, `shared/`, `prisma/`, and project configuration files.
- [x] Root README with overview, problem statement, features, architecture, setup, testing, demo access, screenshots, and future work.
- [x] API documentation in [`API.md`](./API.md).
- [x] Database documentation in [`DATABASE.md`](./DATABASE.md).
- [x] ER diagram in [`ER-DIAGRAM.md`](./ER-DIAGRAM.md).
- [x] Safe environment template in `env-template.txt` (the managed workspace restricts direct `.env.example` editing; use the template as the committed equivalent).
- [x] Prisma schema and seed script.
- [x] Automated regression and security tests.

## Local evaluator flow

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm test
pnpm check
pnpm build
pnpm dev
```

Then visit `/` for the public experience, `/login` for authentication, `/app` for the role-aware dashboard, `/app/projects` for the project register, and `/app/tasks` for the task register.

## Demo accounts

Use only the seeded non-production accounts documented in the README. The Admin account demonstrates project/task/team management. The Team Member account demonstrates assigned-task scoping, status updates, progress comments, deadlines, priorities, and task history.

## GitHub handoff

Before exporting the repository, review `git status --short`, confirm `.env`, local database files, logs, build output, coverage, secrets, and private keys are ignored, and scan tracked files for credential patterns. Create a repository under the evaluator’s selected GitHub owner, then push the source and documentation. Do not commit platform credentials or generated private configuration.

## Deployment handoff

The managed WebDev environment is the recommended deployment target. Create a checkpoint, configure production secrets through the hosting interface, bind the production origin in `CLIENT_ORIGIN`, apply the Prisma schema, seed only if the evaluator requests demo data, and use the platform Publish action. If deploying to another Node host, run `pnpm build` and `pnpm start` with the same environment contract.

## Final quality gates

The final package must pass `pnpm test`, `pnpm check`, and `pnpm build`. The latest QA/security verification covers authentication, RBAC, CRUD, deadline-history transactions, comments, search/filter contracts, progress/activity, database connectivity, API transport, responsive surfaces, 3D landing behavior, accessibility-focused keyboard/readability checks, security headers/origin checks, and production bundle behavior.

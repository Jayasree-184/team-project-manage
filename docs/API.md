# API Reference

## Transport

The backend is exposed through tRPC at `/api/trpc`. The frontend uses the typed tRPC client and does not maintain a second handwritten API contract. Inputs are validated with Zod. A request may authenticate through the HttpOnly session cookie or the supported `Authorization: Bearer <token>` form.

A tRPC client request uses the standard batch shape. For example, a login mutation is conceptually:

```json
{
  "0": {
    "json": {
      "email": "member@teammanager.local",
      "password": "Member123!"
    }
  }
}
```

## Access legend

`Public` requires no session. `Protected` requires a valid session. `Admin` requires a valid session whose server-side role is `ADMIN`. Team Member procedures additionally scope records to the authenticated assignee.

## Procedure matrix

| Procedure | Access | Purpose |
|---|---|---|
| `health` | Public | Returns service health for runtime checks. |
| `auth.login` | Public | Validates credentials, signs a JWT, and sets the hardened session cookie. |
| `auth.logout` | Public | Clears the session cookie and ends the browser session. |
| `auth.me` | Protected | Returns the current user’s public projection without `passwordHash`. |
| `team.list` | Admin | Lists Team Members for assignment and management. |
| `team.create` | Admin | Creates a Team Member using a bcrypt-hashed password. |
| `dashboard.overview` | Admin | Returns aggregate counts, project progress, task pulse, activity, and deadline history. |
| `memberDashboard.overview` | Protected | Returns only the current Team Member’s assigned task categories and records. |
| `projects.list` | Admin | Lists projects with search/filter inputs and derived progress. |
| `projects.get` | Admin | Returns a project and its task register. |
| `projects.create` | Admin | Creates a project and activity event. |
| `projects.update` | Admin | Updates project metadata or archives a project. |
| `tasks.list` | Protected | Lists all permitted tasks; Team Members receive only assigned non-archived-project tasks. |
| `tasks.get` | Protected | Returns authorized task detail, comments, activity, and deadline history. |
| `tasks.create` | Admin | Creates a task and optionally assigns it. |
| `tasks.update` | Admin | Updates task metadata, assignment, priority, status, and deadline; records deadline changes transactionally. |
| `tasks.delete` | Admin | Deletes an Admin-managed task when the input and record are valid. |
| `tasks.updateStatus` | Protected | Updates status; Team Members may update only their assigned tasks. |
| `tasks.comments` | Protected | Lists comments for an authorized task. |
| `tasks.addComment` | Protected | Adds a comment/progress update and activity event for an authorized task. |
| `tasks.deadlineHistory` | Admin | Lists append-only deadline changes in chronological order. |
| `activity.recent` | Protected | Returns recent activity, optionally scoped to an authorized task. |

## Domain contracts

Project statuses are `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, and `ARCHIVED`. Task statuses are `TODO`, `IN_PROGRESS`, `BLOCKED`, and `COMPLETED`. Priorities are `LOW`, `MEDIUM`, `HIGH`, and `URGENT`. Deadlines are UTC timestamps at the API boundary and are localized only for display.

## Error contract

Invalid input is rejected by the Zod-backed procedure contract. Missing or invalid sessions return `UNAUTHORIZED`; authenticated users without the required role or record scope receive `FORBIDDEN`; missing records return `NOT_FOUND`; duplicate or conflicting domain operations return `CONFLICT` and serialize as HTTP 409; unexpected failures are mapped to an internal server error. The server never returns password hashes in public projections.

## Security behavior

State-changing cookie-authenticated requests must satisfy the configured origin policy. JSON request bodies are bounded. The Express boundary sets security headers and a CSP `frame-ancestors 'none'` fallback. Production refuses to start without an explicit JWT secret. Frontend button visibility is not used as the authorization mechanism.

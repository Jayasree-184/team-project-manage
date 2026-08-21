# Entity Relationship Diagram

The following Mermaid diagram reflects the authoritative Prisma schema in `prisma/schema.prisma`.

```mermaid
erDiagram
  USER ||--o{ PROJECT : creates
  USER ||--o{ TASK : creates
  USER ||--o{ TASK : assigned_to
  USER ||--o{ COMMENT : writes
  USER ||--o{ DEADLINE_HISTORY : changes
  USER ||--o{ ACTIVITY : acts
  PROJECT ||--o{ TASK : contains
  PROJECT ||--o{ ACTIVITY : records
  TASK ||--o{ COMMENT : receives
  TASK ||--o{ DEADLINE_HISTORY : tracks
  TASK ||--o{ ACTIVITY : records

  USER {
    string id PK
    string name
    string email UK
    string passwordHash
    enum role
    datetime createdAt
    datetime updatedAt
  }
  PROJECT {
    string id PK
    string name
    text description
    datetime startDate
    datetime endDate
    enum status
    string createdById FK
    datetime createdAt
    datetime updatedAt
  }
  TASK {
    string id PK
    string projectId FK
    string createdById FK
    string assigneeId FK
    string title
    text description
    enum status
    enum priority
    datetime deadline
    datetime createdAt
    datetime updatedAt
  }
  COMMENT {
    string id PK
    string taskId FK
    string authorId FK
    text body
    datetime createdAt
    datetime updatedAt
  }
  DEADLINE_HISTORY {
    string id PK
    string taskId FK
    datetime previousDeadline
    datetime newDeadline
    string changedBy FK
    datetime changedAt
    text reason
  }
  ACTIVITY {
    string id PK
    enum type
    string message
    string actorId FK
    string projectId FK
    string taskId FK
    datetime createdAt
  }
```

`DeadlineHistory` is append-only at the service boundary. A deadline update uses one Prisma transaction to update the task, insert the matching history row, and create the related activity event. Nullable dates represent an initially unset deadline or a deadline removed by an authorized update.

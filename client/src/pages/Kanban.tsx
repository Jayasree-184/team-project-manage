import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/auth/useSession";

const statuses = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type Status = (typeof statuses)[number];
type Priority = (typeof priorities)[number];

const labels: Record<Status, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
};

const formatDate = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleDateString() : "No deadline";

export default function Kanban() {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const input = useMemo(() => ({ search: search || undefined, priority: priority || undefined }), [search, priority]);
  const tasks = trpc.tasks.list.useQuery(input);
  const utils = trpc.useUtils();
  const move = trpc.tasks.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Task moved");
      await Promise.all([tasks.refetch(), utils.dashboard.invalidate(), utils.memberDashboard.invalidate()]);
    },
    onError: error => toast.error(error.message),
    onSettled: () => setDraggedTaskId(null),
  });

  const moveTask = (taskId: string, status: Status) => {
    const task = tasks.data?.find(item => item.id === taskId);
    if (!task || task.status === status || move.isPending) return;
    move.mutate({ taskId, status });
  };

  return <div>
    <header className="topline">
      <div><div className="mono text-[10px]">WORKSPACE / KANBAN</div><div className="text-sm muted mt-1">Drag work across the actual task lifecycle.</div></div>
      <div className="mono text-[10px]">{tasks.data?.length ?? 0} VISIBLE TASKS</div>
    </header>
    <div className="kanban-heading">
      <div><h1 className="page-title display">Task<br /><span className="text-[#b85f35]">board.</span></h1><p className="muted max-w-xl">A status-first view for moving assigned work from brief to delivery. Every move is saved to the backend.</p></div>
      <Link className="btn btn-outline" href="/app/tasks">TABLE VIEW →</Link>
    </div>
    <section className="panel kanban-toolbar">
      <label className="sr-only" htmlFor="kanban-search">Search tasks</label>
      <input id="kanban-search" className="field" placeholder="Search title or description…" value={search} onChange={event => setSearch(event.target.value)} />
      <label className="sr-only" htmlFor="kanban-priority">Filter priority</label>
      <select id="kanban-priority" className="field" value={priority} onChange={event => setPriority(event.target.value as Priority | "")}><option value="">All priorities</option>{priorities.map(value => <option key={value} value={value}>{value}</option>)}</select>
    </section>
    {tasks.isLoading ? <div className="loading-state mt-5"><div className="mono text-[10px]">BOARD / SYNCING</div><div className="muted text-sm mt-2">Loading live task lanes…</div></div> : tasks.error ? <div className="error-box mt-5">{tasks.error.message}</div> : <section className="kanban-board" aria-label="Kanban task board">{statuses.map(status => {
      const laneTasks = (tasks.data ?? []).filter(task => task.status === status);
      return <div className={`kanban-lane kanban-lane-${status.toLowerCase()}`} key={status} onDragOver={event => event.preventDefault()} onDrop={() => draggedTaskId && moveTask(draggedTaskId, status)}>
        <div className="kanban-lane-head"><div><div className="mono text-[10px]">{String(statuses.indexOf(status) + 1).padStart(2, "0")} / LANE</div><h2>{labels[status]}</h2></div><span className="kanban-count">{laneTasks.length}</span></div>
        <div className="kanban-lane-body">{laneTasks.length === 0 ? <div className="kanban-empty"><span className="mono text-[9px]">EMPTY LANE</span><span>Drop work here</span></div> : laneTasks.map(task => <article className={`kanban-card ${draggedTaskId === task.id ? "is-dragging" : ""}`} key={task.id} draggable={!move.isPending} onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)}>
          <div className="flex items-start justify-between gap-3"><span className="badge">{task.priority}</span><span className="mono text-[9px] muted">#{task.id}</span></div>
          <Link className="kanban-card-title" href={`/app/tasks/${task.id}`}>{task.title}</Link>
          <div className="mono text-[9px] muted">{task.project.name}</div>
          <div className="kanban-card-meta"><span>{task.assignee?.name ?? "Unassigned"}</span><span>{formatDate(task.deadline)}</span></div>
        </article>)}</div>
      </div>;
    })}</section>}
    <div className="mono text-[9px] muted mt-4">{user?.role === "ADMIN" ? "ADMIN CONTROL / ALL TASKS" : "OPERATOR SCOPE / ASSIGNED TASKS ONLY"} · DRAG AND DROP ENABLED</div>
  </div>;
}

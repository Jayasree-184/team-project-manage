import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/auth/useSession";
import AdminOperations from "@/components/AdminOperations";

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function formatDateTime(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

function Stat({ label, value, note, accent = false }: { label: string; value: number | string; note: string; accent?: boolean }) {
  return <article className={`panel stat-card ${accent ? "panel-orange" : ""}`}>
    <div className="mono text-[10px]">{label}</div>
    <strong className="display text-5xl">{typeof value === "number" ? value.toString().padStart(2, "0") : value}</strong>
    <div className={accent ? "text-sm" : "text-sm muted"}>{note}</div>
  </article>;
}

function AdminDashboard() {
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState("ALL");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("ALL");
  const overviewInput = useMemo(() => ({ projectSearch: projectSearch || undefined, projectStatus: projectStatus === "ALL" ? undefined : projectStatus as "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED", taskSearch: taskSearch || undefined, taskStatus: taskStatus === "ALL" ? undefined : taskStatus as "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" }), [projectSearch, projectStatus, taskSearch, taskStatus]);
  const overview = trpc.dashboard.overview.useQuery(overviewInput);
  const team = trpc.team.list.useQuery();
  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [teamPassword, setTeamPassword] = useState("Member123!");
  const createMember = trpc.team.create.useMutation({ onSuccess: () => { team.refetch(); setTeamName(""); setTeamEmail(""); } });
  const data = overview.data;
  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];
  const stats = data?.stats;

  if (overview.isLoading) return <div className="panel loading-state"><div><div className="mono text-[10px]">CONTROL ROOM / CALIBRATING</div><div className="muted text-sm mt-2">Syncing live register data…</div></div></div>;
  if (overview.error) return <div className="error-box"><strong>Unable to load the Admin Dashboard.</strong><br />{overview.error.message}</div>;

  return <>
    <header className="topline"><div><div className="mono text-[10px]">PROJECT CONTROL SYSTEM / ADMINISTRATOR</div><div className="text-sm muted mt-1">Command center · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div></div><div className="mono text-[10px]">LIVE / DATABASE LINKED</div></header>
    <div className="dashboard-hero"><div className="mono text-[10px]">ATLAS OFFICE / OPERATIONS DESK 01</div><h1 className="page-title display">Project<br /><span className="text-[#b85f35]">control system.</span></h1><p className="hero-copy">A live register of work in motion, deadlines under pressure, and the operators moving the system forward.</p></div>

    <section className="grid-cards mb-8" aria-label="Dashboard statistics">
      <Stat label="TOTAL PROJECTS" value={stats?.totalProjects ?? 0} note="Active system register" />
      <Stat label="ACTIVE PROJECTS" value={stats?.activeProjects ?? 0} note="Currently in motion" accent />
      <Stat label="TOTAL TASKS" value={stats?.totalTasks ?? 0} note="Across non-archived work" />
      <Stat label="COMPLETED TASKS" value={stats?.completedTasks ?? 0} note="Closed successfully" />
      <Stat label="OVERDUE TASKS" value={stats?.overdueTasks ?? 0} note="Requires intervention" accent={Boolean(stats?.overdueTasks)} />
      <Stat label="TEAM MEMBERS" value={stats?.teamMembers ?? 0} note="Available operators" />
    </section>

    <section className="grid-cards dashboard-section">
      <div className="panel data-card dashboard-wide">
        <div className="section-heading"><div><div className="mono text-[10px]">PROJECTS / REGISTER</div><h2 className="display text-3xl mt-1">Projects under control</h2></div><Link href="/app/projects" className="btn btn-outline text-xs">OPEN PROJECTS →</Link></div>
        <div className="filter-strip"><input className="field" placeholder="Search projects…" value={projectSearch} onChange={e => setProjectSearch(e.target.value)} /><select className="field" value={projectStatus} onChange={e => setProjectStatus(e.target.value)}><option value="ALL">ALL STATUS</option><option value="PLANNING">PLANNING</option><option value="ACTIVE">ACTIVE</option><option value="ON_HOLD">ON HOLD</option><option value="COMPLETED">COMPLETED</option></select></div>
        {projects.length === 0 ? <div className="empty-state"><div><div className="display text-3xl">No project records.</div><div className="muted text-sm mt-2">Adjust the register filters to widen the view.</div></div></div> : <div className="dashboard-list">{projects.map(project => <div className="dashboard-row project-row" key={project.id}><div><Link href={`/app/projects/${project.id}`} className="font-bold hover:underline">{project.name}</Link><div className="text-xs muted mt-1">{project.taskCount} tasks · updated {formatDate(project.updatedAt)}</div></div><span className="badge">{project.status}</span><div className="progress-cell"><div className="flex justify-between mono text-[9px]"><span>PROGRESS</span><span>{project.progress}%</span></div><div className="progress-track mt-1"><div className="progress-fill" style={{ width: `${project.progress}%` }} /></div></div></div>)}</div>}
      </div>

      <aside className="panel side-card dashboard-side"><div className="mono text-[10px]">PROGRESS / READOUT</div><h2 className="display text-3xl mt-1">System pulse</h2><div className="dashboard-meter mt-6"><div className="meter-ring"><span>{stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%</span></div><div><div className="mono text-[10px]">GLOBAL COMPLETION</div><p className="text-sm muted mt-2">Closed tasks against the live system register.</p></div></div><div className="border-t border-black/30 mt-6 pt-4 space-y-3">{["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"].map(status => { const count = (data?.projects ?? []).filter(project => project.status === status).length; return <div className="flex justify-between items-center" key={status}><span className="mono text-[10px]">{status}</span><strong className="display text-xl">{count.toString().padStart(2, "0")}</strong></div>; })}</div></aside>
    </section>

    <section className="grid-cards dashboard-section">
      <div className="panel data-card dashboard-wide"><div className="section-heading"><div><div className="mono text-[10px]">TASKS / WORK QUEUE</div><h2 className="display text-3xl mt-1">Tasks in motion</h2></div><Link href="/app/tasks" className="btn btn-outline text-xs">OPEN TASKS →</Link></div><div className="filter-strip"><input className="field" placeholder="Search title, project, description…" value={taskSearch} onChange={e => setTaskSearch(e.target.value)} /><select className="field" value={taskStatus} onChange={e => setTaskStatus(e.target.value)}><option value="ALL">ALL STATUS</option><option value="TODO">TODO</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="BLOCKED">BLOCKED</option><option value="COMPLETED">COMPLETED</option></select></div>{tasks.length === 0 ? <div className="empty-state"><div><div className="display text-3xl">No work in view.</div><div className="muted text-sm mt-2">Adjust the queue filters to widen the register.</div></div></div> : <div className="dashboard-list">{tasks.map(task => <div className="dashboard-row task-row" key={task.id}><div><Link href={`/app/tasks/${task.id}`} className="font-bold hover:underline">{task.title}</Link><div className="mono text-[9px] muted mt-1">{task.project.name}</div></div><span className="badge">{task.priority}</span><span className="badge">{task.status}</span><div className="text-right"><div className={`mono text-[9px] ${task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED" ? "text-[#9f2f1e]" : "muted"}`}>{task.deadline ? `DUE ${formatDate(task.deadline)}` : "NO DEADLINE"}</div><div className="text-xs muted mt-1">{task.assignee?.name ?? "Unassigned"}</div></div></div>)}</div>}</div>
      <aside className="panel side-card dashboard-side"><div className="mono text-[10px]">TEAM / DIRECTORY</div><h2 className="display text-3xl mt-1">Operators</h2><div className="mt-4">{(team.data ?? []).slice(0, 5).map(member => <div className="team-line" key={member.id}><div className="team-initial">{member.name.charAt(0).toUpperCase()}</div><div><div className="font-bold text-sm">{member.name}</div><div className="mono text-[9px] muted mt-1">{member.email}</div></div></div>)}{(team.data ?? []).length === 0 && <div className="muted text-sm">No team members registered.</div>}</div><form className="mt-6 space-y-2" onSubmit={e => { e.preventDefault(); if (teamName.trim() && teamEmail.trim()) createMember.mutate({ name: teamName, email: teamEmail, password: teamPassword }); }}><div className="mono text-[9px] mb-2">ADD OPERATOR</div><input className="field" placeholder="Name" value={teamName} onChange={e => setTeamName(e.target.value)} /><input className="field" placeholder="Email" type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} /><button className="btn w-full text-xs" disabled={createMember.isPending}>{createMember.isPending ? "ADDING…" : "ADD TEAM MEMBER"}</button></form></aside>
    </section>

    <section className="grid-cards dashboard-section">
      <div className="panel data-card dashboard-wide"><div className="section-heading"><div><div className="mono text-[10px]">ACTIVITY / LIVE LOG</div><h2 className="display text-3xl mt-1">Field activity</h2></div><span className="mono text-[10px] muted">LAST 10 EVENTS</span></div><div className="timeline">{(data?.activities ?? []).map(activity => <div className="timeline-row" key={activity.id}><div className="timeline-mark" /><div><div className="font-bold text-sm">{activity.message}</div><div className="mono text-[9px] muted mt-1">{activity.actor.name} · {formatDateTime(activity.createdAt)}</div></div><span className="badge ml-auto">{activity.type.replaceAll("_", " ")}</span></div>)}{(data?.activities ?? []).length === 0 && <div className="empty-state"><div><div className="display text-2xl">No activity logged.</div><div className="muted text-sm mt-2">The field log will appear as work moves.</div></div></div>}</div></div>
      <aside className="panel side-card dashboard-side"><div className="mono text-[10px]">DEADLINE HISTORY / AUDIT</div><h2 className="display text-3xl mt-1">Deadline shifts</h2><div className="timeline compact">{(data?.deadlineHistory ?? []).map(history => <div className="timeline-row" key={history.id}><div className="timeline-mark orange" /><div><Link href={`/app/tasks/${history.task.id}`} className="font-bold text-sm hover:underline">{history.task.title}</Link><div className="text-xs muted mt-1">{history.task.project.name}</div><div className="mono text-[9px] mt-2">{formatDate(history.previousDeadline)} → {formatDate(history.newDeadline)}</div><div className="text-xs muted mt-1">{history.reason || "No reason recorded"}</div></div></div>)}{(data?.deadlineHistory ?? []).length === 0 && <div className="empty-state"><div><div className="display text-2xl">No shifts recorded.</div><div className="muted text-sm mt-2">Deadline changes will remain visible here.</div></div></div>}</div></aside>
    </section>

    <section className="panel dashboard-section"><div className="section-heading"><div><div className="mono text-[10px]">ADMINISTRATION / OPERATIONS</div><h2 className="display text-3xl mt-1">Manage the system</h2></div><span className="mono text-[10px] muted">CRUD / ASSIGN / PRIORITIZE / DEADLINE</span></div><AdminOperations /></section>
  </>;
}

function MemberDashboard() {
  const overview = trpc.memberDashboard.overview.useQuery();
  const updateStatus = trpc.tasks.updateStatus.useMutation({ onSuccess: () => overview.refetch() });
  const addComment = trpc.tasks.addComment.useMutation({ onSuccess: () => overview.refetch() });
  const [commentTask, setCommentTask] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"ALL" | "TODAY" | "HIGH" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE">("ALL");
  const data = overview.data;
  const rows = useMemo(() => (data?.tasks ?? []).filter(task => {
    const haystack = `${task.title} ${task.description} ${task.project.name}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const now = new Date();
    const isToday = task.deadline && new Date(task.deadline).toDateString() === now.toDateString();
    const isOverdue = task.deadline && new Date(task.deadline) < now && task.status !== "COMPLETED";
    const matchesView = view === "ALL" || (view === "TODAY" && isToday) || (view === "HIGH" && (task.priority === "HIGH" || task.priority === "URGENT") && task.status !== "COMPLETED") || (view === "IN_PROGRESS" && task.status === "IN_PROGRESS") || (view === "COMPLETED" && task.status === "COMPLETED") || (view === "OVERDUE" && isOverdue);
    return matchesSearch && matchesView;
  }), [data?.tasks, search, view]);
  if (overview.isLoading) return <div className="panel py-16 text-center"><div className="mono text-xs">LOADING ASSIGNED WORKSPACE…</div></div>;
  if (overview.error) return <div className="error-box"><strong>Unable to load your assigned workspace.</strong><br />{overview.error.message}</div>;
  const stats = data?.stats;
  const progress = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const buckets = [{ key: "ALL", label: "MY TASKS", value: stats?.total ?? 0, note: "Assigned to you" }, { key: "TODAY", label: "TODAY'S DEADLINES", value: stats?.today ?? 0, note: "Due before day close" }, { key: "HIGH", label: "HIGH PRIORITY", value: stats?.highPriority ?? 0, note: "High or urgent" }, { key: "IN_PROGRESS", label: "IN PROGRESS", value: stats?.inProgress ?? 0, note: "Currently moving" }, { key: "COMPLETED", label: "COMPLETED", value: stats?.completed ?? 0, note: "Closed work" }, { key: "OVERDUE", label: "OVERDUE", value: stats?.overdue ?? 0, note: "Needs attention" }];
  return <>
    <header className="topline"><div><div className="mono text-[10px]">CONTROL ROOM / TEAM MEMBER</div><div className="text-sm muted mt-1">Assigned workbench · personal scope only</div></div><div className="mono text-[10px]">{overview.isFetching ? "SYNCING" : "LIVE / SCOPED"}</div></header>
    <div className="dashboard-hero member-hero"><div><div className="mono text-[10px]">ATLAS OFFICE / OPERATOR CONSOLE</div><h1 className="page-title display">Your work<br /><span className="text-[#b85f35]">in motion.</span></h1></div><p className="hero-copy">A quiet register of your assigned work. Change status, leave a progress note, and keep the next deadline visible.</p></div>
    <section className="member-stat-grid" aria-label="My task categories">{buckets.map(bucket => <button key={bucket.key} className={`panel member-stat ${view === bucket.key ? "member-stat-active" : ""}`} onClick={() => setView(bucket.key as typeof view)}><div className="mono text-[10px]">{bucket.label}</div><strong className="display text-4xl">{bucket.value.toString().padStart(2, "0")}</strong><div className="text-xs muted">{bucket.note}</div></button>)}</section>
    <section className="grid-cards dashboard-section"><div className="panel data-card dashboard-wide"><div className="section-heading"><div><div className="mono text-[10px]">MY TASKS / AUTHORIZED REGISTER</div><h2 className="display text-3xl mt-1">Assigned work</h2></div><div className="mono text-[10px]">COMPLETION {progress}%</div></div><div className="member-progress"><div className="flex justify-between mono text-[9px]"><span>PERSONAL PROGRESS</span><span>{stats?.completed ?? 0} / {stats?.total ?? 0} COMPLETE</span></div><div className="progress-track mt-1"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div><div className="filter-strip mt-5"><input className="field" placeholder="Search your tasks…" value={search} onChange={e => setSearch(e.target.value)} /><div className="mono text-[10px] border-2 border-black px-3 py-3">VIEW / {view.replaceAll("_", " ")}</div></div>{rows.length === 0 ? <div className="empty-state"><div><div className="display text-3xl">No assigned work.</div><div className="muted text-sm mt-2">Choose another task bucket or clear the search.</div></div></div> : <div className="dashboard-list"><div className="member-task-head mono text-[9px]"><span>TASK / PROJECT</span><span>PRIORITY</span><span>STATUS</span><span>DEADLINE</span><span>HISTORY</span></div>{rows.map(task => { const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED"; return <div className="member-task-row" key={task.id}><div><Link href={`/app/tasks/${task.id}`} className="font-bold hover:underline">{task.title}</Link><div className="mono text-[9px] muted mt-1">{task.project.name}</div></div><span className={`badge ${task.priority === "URGENT" || task.priority === "HIGH" ? "badge-alert" : ""}`}>{task.priority}</span><select className="field !w-auto !py-1 !text-xs" value={task.status} onChange={e => updateStatus.mutate({ taskId: task.id, status: e.target.value as "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" })}><option value="TODO">TODO</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="BLOCKED">BLOCKED</option><option value="COMPLETED">COMPLETED</option></select><span className={`mono text-[10px] ${overdue ? "text-[#9f2f1e]" : ""}`}>{overdue ? "OVERDUE / " : ""}{formatDate(task.deadline)}</span><Link href={`/app/tasks/${task.id}`} className="mono text-[9px] hover:underline">{task._count.deadlineHistory} EVENTS →</Link><div className="member-task-actions"><button className="btn btn-outline text-xs" onClick={() => setCommentTask(commentTask === task.id ? null : task.id)}>{commentTask === task.id ? "CLOSE NOTE" : "ADD PROGRESS UPDATE"}</button>{commentTask === task.id && <div className="member-note"><textarea className="field text-sm" rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe progress, blockers, or next action…" /><button className="btn mt-2 text-xs" disabled={addComment.isPending} onClick={() => { if (comment.trim()) { addComment.mutate({ taskId: task.id, body: comment }); setComment(""); setCommentTask(null); } }}>{addComment.isPending ? "POSTING…" : "POST UPDATE"}</button></div>}</div></div>; })}</div>}</div><aside className="panel side-card dashboard-side"><div className="mono text-[10px]">WORK RULES / ACCESS</div><h2 className="display text-3xl mt-1">Your scope</h2><div className="border-t border-black/30 mt-5 pt-4 space-y-4"><div><div className="mono text-[10px]">VISIBLE</div><p className="text-sm muted mt-1">Only tasks assigned to your operator account.</p></div><div><div className="mono text-[10px]">CAN CHANGE</div><p className="text-sm muted mt-1">Status, comments, progress updates, and task history.</p></div><div><div className="mono text-[10px]">READ ONLY</div><p className="text-sm muted mt-1">Priority, project, and deadline metadata.</p></div><div className="border-t-2 border-black pt-4"><div className="mono text-[10px]">RESTRICTED</div><p className="text-sm font-bold mt-1">Project creation, task assignment, priority changes, and deadline changes remain Admin-only.</p></div></div></aside></section>
  </>;
}

export default function Dashboard() {
  const { user } = useSession();
  return user?.role === "ADMIN" ? <AdminDashboard /> : <MemberDashboard />;
}

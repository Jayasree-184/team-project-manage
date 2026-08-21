import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSession } from "@/auth/useSession";

const statuses = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
const displayDate = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleDateString() : "—";

export default function Projects() {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number] | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const queryInput = useMemo(() => ({ search: search || undefined, status: status || undefined }), [search, status]);
  const projects = trpc.projects.list.useQuery(queryInput, { enabled: user?.role === "ADMIN" });
  const create = trpc.projects.create.useMutation({ onSuccess: async () => { toast.success("Project created"); setFormMessage("Project created."); setName(""); setDescription(""); setStartDate(""); setEndDate(""); await projects.refetch(); }, onError: error => { toast.error(error.message); setFormMessage(error.message); } });
  const remove = trpc.projects.delete.useMutation({ onSuccess: async () => { toast.success("Project deleted"); setFormMessage("Project deleted."); await projects.refetch(); }, onError: error => { toast.error(error.message); setFormMessage(error.message); } });

  if (user?.role !== "ADMIN") return <div className="error-box">Project management is restricted to Admin operators.</div>;
  return <div>
    <header className="topline"><div><div className="mono text-[10px]">ADMIN / PROJECT REGISTER</div><div className="text-sm muted mt-1">Portfolio control surface</div></div><div className="mono text-[10px]">{projects.data?.length ?? 0} RECORDS</div></header>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="page-title display">Project<br /><span className="text-[#b85f35]">register.</span></h1><p className="muted max-w-xl">Every project is a live relationship between scope, deadlines, and completed work.</p></div><Link className="btn btn-outline" href="/app/tasks">OPEN TASK REGISTER →</Link></div>
    <section className="grid lg:grid-cols-[1fr_320px] gap-5 mt-8"><div className="panel data-card">
      <div className="flex flex-wrap gap-3 mb-5"><input className="field flex-1 min-w-[220px]" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} /><select className="field !w-auto" value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></div>
      {projects.isLoading ? <div className="loading-state"><div><div className="mono text-[10px]">REGISTER / SYNCING</div><div className="muted text-sm mt-2">Loading project register…</div></div></div> : projects.error ? <div className="error-box">{projects.error.message}</div> : !projects.data?.length ? <div className="empty-state"><div><div className="display text-3xl">No matching records.</div><div className="muted text-sm mt-2">Adjust the register filters or create a new project.</div></div></div> : <div>{projects.data.map(project => <article className="table-row !grid-cols-[1fr_auto] md:!grid-cols-[1fr_120px_110px_100px] gap-4" key={project.id}><div><Link href={`/app/projects/${project.id}`} className="font-bold text-lg hover:underline">{project.name}</Link><div className="muted text-sm mt-1 line-clamp-2">{project.description || "No description provided."}</div><div className="mono text-[9px] muted mt-2">{displayDate(project.startDate)} → {displayDate(project.endDate)}</div></div><span className="badge h-fit">{project.status}</span><div><div className="mono text-[9px]">PROGRESS</div><div className="font-bold">{project.progress}%</div><div className="progress-track"><div className="progress-fill" style={{ width: `${project.progress}%` }} /></div></div><div className="flex md:flex-col gap-2 items-end"><Link className="mono text-[9px] underline" href={`/app/projects/${project.id}`}>DETAILS</Link><button className="mono text-[9px] underline text-red-700" onClick={() => window.confirm(`Delete ${project.name}?`) && remove.mutate({ projectId: project.id })}>DELETE</button></div></article>)}</div>}
    </div><aside className="panel side-card"><div className="mono text-[10px]">NEW PROJECT</div><h2 className="display text-3xl mt-1 mb-5">Set the frame.</h2><form className="space-y-3" onSubmit={e => { e.preventDefault(); setFormMessage(""); create.mutate({ name, description, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, status: "PLANNING" }); }}><input className="field" required placeholder="Project name" value={name} onChange={e => setName(e.target.value)} /><textarea className="field" rows={4} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} /><label className="mono text-[9px]">START DATE<input className="field mt-1" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label className="mono text-[9px]">END DATE<input className="field mt-1" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label><button className="btn w-full" disabled={create.isPending}>{create.isPending ? "CREATING…" : "CREATE PROJECT"}</button></form>{formMessage && <div className="success-state mt-4"><div className="mono text-[9px]">OPERATION STATUS</div><div className="text-sm font-bold mt-1">{formMessage}</div></div>}</aside></section>
  </div>;
}

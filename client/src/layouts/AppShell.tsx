import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, FolderKanban, ListTodo, Users, ArrowUpRight, Moon, Sun, Columns3 } from "lucide-react";
import { ArchitecturalScene } from "@/components/ArchitecturalScene";
import { useSession } from "@/auth/useSession";
import { useTheme } from "@/contexts/ThemeContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/login");
  };
  const links = [
    { href: "/app", label: "Overview", short: "01", icon: LayoutDashboard },
    ...(user?.role === "ADMIN" ? [{ href: "/app/projects", label: "Projects", short: "02", icon: FolderKanban }] : []),
    { href: "/app/tasks", label: user?.role === "ADMIN" ? "All tasks" : "My tasks", short: "03", icon: ListTodo },
    { href: "/app/kanban", label: "Kanban board", short: "04", icon: Columns3 },
    ...(user?.role === "ADMIN" ? [{ href: "/app/team", label: "Team", short: "05", icon: Users }] : []),
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark"><div className="brand-glyph" aria-hidden="true" /><div><div className="mono text-[10px]">TPM / 01 · CONTROL</div><div className="font-bold text-lg tracking-tight">Atlas Office</div></div></div>
      <div className="sidebar-register"><span className="mono text-[9px]">REGISTER</span><strong>LIVE</strong><span className="status-dot" aria-hidden="true" /></div>
      <div className="mono text-[10px] muted">Project control system / {user?.role === "ADMIN" ? "administrator" : "operator"}</div>
      <nav aria-label="Primary navigation" className="flex flex-col gap-1">{links.map(({ href, label, short, icon: Icon }) => { const active = location === href || (href !== "/app" && location.startsWith(`${href}/`)); return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}><span className="flex items-center gap-2"><span className="nav-index">{short}</span><Icon size={15} aria-hidden="true" />{label}</span><ArrowUpRight size={13} aria-hidden="true" /></Link>; })}</nav>
      <div className="sidebar-note"><div className="mono text-[9px]">SYSTEM NOTE</div><p>Make work visible. Keep the record intact.</p></div>
      <button className="btn btn-outline theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><span className="flex items-center gap-2">{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "Light mode" : "Dark mode"}</span><span className="mono text-[9px]">{theme === "dark" ? "DAY" : "NIGHT"}</span></button>
      <div className="profile-box mt-auto border-t-2 border-black pt-4"><div className="mono text-[10px]">Authenticated operator</div><div className="font-bold mt-2">{user?.name}</div><div className="mono text-[10px] mt-1">{user?.role}</div><button className="btn btn-outline mt-5 w-full flex items-center justify-center gap-2" onClick={handleLogout}><LogOut size={14} /> Sign out</button></div>
    </aside>
    <main className="main-canvas"><div className="scene-layer"><ArchitecturalScene /></div><div className="content-layer">{children}</div></main>
  </div>;
}

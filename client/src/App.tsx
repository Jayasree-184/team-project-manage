import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
const Landing = lazy(() => import("./pages/Landing"));
import Dashboard from "./pages/Dashboard";
import TaskDetail from "./pages/TaskDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Tasks from "./pages/Tasks";
import Kanban from "./pages/Kanban";
import { AppShell } from "./layouts/AppShell";
import { useSession } from "./auth/useSession";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <div className="min-h-screen grid place-items-center concrete"><div className="mono text-xs">AUTHENTICATING OPERATOR…</div></div>;
  if (!user) return <Redirect to="/login" />;
  return <AppShell>{children}</AppShell>;
}

function Router() {
  return <Switch>
    <Route path="/login" component={Login} />
    <Route path="/app/tasks/:taskId"><Protected><TaskDetail /></Protected></Route>
    <Route path="/app/projects/:projectId"><Protected><ProjectDetail /></Protected></Route>
    <Route path="/app/projects"><Protected><Projects /></Protected></Route>
    <Route path="/app/tasks"><Protected><Tasks /></Protected></Route>
    <Route path="/app/kanban"><Protected><Kanban /></Protected></Route>
    <Route path="/app/team"><Protected><Dashboard /></Protected></Route>
    <Route path="/app"><Protected><Dashboard /></Protected></Route>
    <Route path="/">
      <Suspense fallback={<div className="min-h-screen grid place-items-center concrete"><div className="mono text-xs">LOADING ARCHITECTURE…</div></div>}>
        <Landing />
      </Suspense>
    </Route>
    <Route><Redirect to="/app" /></Route>
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><TooltipProvider><Toaster /><Router /></TooltipProvider></ErrorBoundary>;
}

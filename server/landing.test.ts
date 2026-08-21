import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(process.cwd(), "client/src");
const landingSource = readFileSync(resolve(clientRoot, "pages/Landing.tsx"), "utf8");
const appSource = readFileSync(resolve(clientRoot, "App.tsx"), "utf8");

describe("public landing experience", () => {
  it("contains the command-center hero, technical readouts, and seven scene markers", () => {
    expect(landingSource).toContain("PROJECT");
    expect(landingSource).toContain("CONTROL");
    expect(landingSource).toContain("PLAN. ASSIGN. EXECUTE.");
    expect(landingSource).toContain("SYSTEM STATUS");
    expect(landingSource).toContain("SCENE PROGRESS");
    expect((landingSource.match(/id: \"0[1-7]\"/g) ?? [])).toHaveLength(7);
  });

  it("keeps the public root separate from protected application routes", () => {
    expect(appSource).toContain('const Landing = lazy(() => import("./pages/Landing"));');
    expect(appSource).toContain('<Route path="/">');
    expect(appSource).toContain('<Landing />');
    expect(appSource).toContain('<Route path="/login" component={Login} />');
    expect(appSource).toContain('<Route path="/app/projects"><Protected><Projects /></Protected></Route>');
    expect(appSource).toContain('<Route path="/app"><Protected><Dashboard /></Protected></Route>');
    expect(appSource).toContain('<Route path="/app/tasks/:taskId"><Protected><TaskDetail /></Protected></Route>');
  });

  it("hands the CTA to the real authenticated dashboard or login route", () => {
    expect(landingSource).toContain("const enterDashboard = () =>");
    expect(landingSource).toContain('navigate(user ? "/app" : "/login")');
    expect(landingSource).toContain("CONTROL TERMINAL / HANDOFF");
    expect(landingSource).toContain("landing-canvas-handoff");
    expect(landingSource).toContain("requestAnimationFrame(animateHandoff)");
    expect(landingSource).not.toContain("window.location.href");
  });
});

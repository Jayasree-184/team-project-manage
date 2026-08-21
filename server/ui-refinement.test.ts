import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("UI refinement contracts", () => {
  it("keeps the shared editorial/brutalist primitives and responsive rules", () => {
    const css = read("client/src/index.css");
    expect(css).toContain(".brutalist-border");
    expect(css).toContain(".loading-state");
    expect(css).toContain(".empty-state");
    expect(css).toContain(".success-state");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain('[data-slot="dialog-content"]');
    expect(css).toContain(".register-chart");
  });

  it("keeps operational detail surfaces discoverable", () => {
    const taskDetail = read("client/src/pages/TaskDetail.tsx");
    const projectDetail = read("client/src/pages/ProjectDetail.tsx");
    expect(taskDetail).toContain("PROGRESS UPDATES");
    expect(taskDetail).toContain("AUDIT TRAIL / DEADLINE HISTORY");
    expect(taskDetail).toContain("POST UPDATE");
    expect(projectDetail).toContain("PROJECT FILE / OPENING");
    expect(projectDetail).toContain("No work breakdown.");
  });

  it("preserves real application navigation and dashboard boundaries", () => {
    const app = read("client/src/App.tsx");
    const shell = read("client/src/layouts/AppShell.tsx");
    expect(app).toContain('path="/app"');
    expect(app).toContain('path="/app/tasks"');
    expect(app).toContain('path="/app/projects"');
    expect(app).toContain('const Landing = lazy(() => import("./pages/Landing"));');
    expect(shell).toContain('href: "/app"');
    expect(shell).toContain('href: "/app/tasks"');
  });

  it("keeps evaluator credential copy controls lightweight and accessible", () => {
    const login = read("client/src/pages/Login.tsx");
    const css = read("client/src/index.css");
    expect(login).toContain("Copy Admin demo credentials");
    expect(login).toContain("Copy Team Member demo credentials");
    expect(login).toContain("navigator.clipboard.writeText");
    expect(login).toContain("aria-label");
    expect(css).toContain(".login-copy-btn");
    expect(css).toContain(".credential-row");
  });
});

import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

describe("Kanban and theme integration", () => {
  it("registers a protected Kanban route and uses the status mutation", async () => {
    const app = await source("client/src/App.tsx");
    const board = await source("client/src/pages/Kanban.tsx");
    expect(app).toContain('path="/app/kanban"');
    expect(board).toContain("trpc.tasks.updateStatus.useMutation");
    expect(board).toContain("draggable");
    expect(board).toContain("onDrop");
  });

  it("mounts persistent theme state and exposes a navigation toggle", async () => {
    const main = await source("client/src/main.tsx");
    const shell = await source("client/src/layouts/AppShell.tsx");
    const context = await source("client/src/contexts/ThemeContext.tsx");
    expect(main).toContain("<ThemeProvider defaultTheme=\"light\" switchable>");
    expect(shell).toContain("useTheme");
    expect(shell).toContain("theme-toggle");
    expect(context).toContain('localStorage.setItem("theme", theme)');
  });
});

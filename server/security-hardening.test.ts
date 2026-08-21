import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveJwtSecret } from "./config/env";

describe("security hardening", () => {
  it("fails closed when production has no configured JWT secret", () => {
    expect(() => resolveJwtSecret("production", undefined)).toThrow("JWT_SECRET is required in production");
  });

  it("generates a non-predictable development secret when configuration is absent", () => {
    const first = resolveJwtSecret("development", undefined);
    const second = resolveJwtSecret("development", undefined);
    expect(first).toHaveLength(64);
    expect(second).toHaveLength(64);
    expect(first).not.toBe(second);
  });

  it("preserves an explicitly configured secret in every environment", () => {
    expect(resolveJwtSecret("production", "configured-secret-value")).toBe("configured-secret-value");
  });

  it("keeps clickjacking protection when the proxy omits X-Frame-Options", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
    expect(source).toContain('Content-Security-Policy", "frame-ancestors \'none\'');
  });
});


import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./auth/jwt";

describe("JWT configuration", () => {
  it("accepts a token issued with the configured issuer and audience", () => {
    const token = signAccessToken({ sub: "config-check", role: "TEAM_MEMBER", email: "check@example.com", name: "Config Check" });
    const claims = verifyAccessToken(token);
    expect(claims?.sub).toBe("config-check");
    expect(claims?.role).toBe("TEAM_MEMBER");
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ sub: "tamper-check", role: "ADMIN", email: "check@example.com", name: "Tamper Check" });
    const [header, payload, signature] = token.split(".");
    const tampered = `${header}.${payload}x.${signature}`;
    expect(verifyAccessToken(tampered)).toBeNull();
  });
});

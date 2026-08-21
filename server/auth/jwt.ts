import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { ENV } from "../config/env";

const JWT_SECRET = ENV.JWT_SECRET;
const JWT_ISSUER = ENV.JWT_ISSUER;
const JWT_AUDIENCE = ENV.JWT_AUDIENCE;

export type SessionClaims = {
  sub: string;
  role: Role;
  email: string;
  name: string;
};

export function signAccessToken(claims: SessionClaims) {
  return jwt.sign(claims, JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): SessionClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as SessionClaims;
  } catch {
    return null;
  }
}

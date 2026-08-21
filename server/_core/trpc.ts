import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ZodError } from "zod";

export function applicationErrorCode(error: unknown) {
  return error instanceof ZodError ? "VALIDATION_ERROR" as const : undefined;
}

export function trpcHttpStatus(code: string) {
  const statuses: Record<string, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  };
  return statuses[code] ?? 500;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const applicationCode = applicationErrorCode(error.cause);
    return {
      ...shape,
      data: {
        ...shape.data,
        ...(applicationCode ? { code: applicationCode } : {}),
        httpStatus: trpcHttpStatus(error.code),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication is required." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access is required." });
  }
  return next({ ctx });
});

export const teamMemberProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "TEAM_MEMBER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Team Member access is required." });
  }
  return next({ ctx });
});

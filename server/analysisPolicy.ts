import { TRPCError } from "@trpc/server";

/** Enforces ownership before an analysis row can be returned to a browser. */
export function requireOwnedAnalysis<T extends { userId: number }>(
  analysis: T | undefined,
  requestingUserId: number,
): T {
  if (!analysis || analysis.userId !== requestingUserId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This analysis record was not found.",
    });
  }

  return analysis;
}

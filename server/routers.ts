import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { requireOwnedAnalysis } from "./analysisPolicy";
import {
  createAnalysis,
  getAnalysisByIdForUser,
  listAnalysesByUserId,
} from "./db";
import { getInferenceState, type Prediction } from "./inference";
import { allowedImageMimeTypes, parseImageDataUrl, submitImageAnalysis } from "./analysisService";

export { parseImageDataUrl } from "./analysisService";

function analysisView(row: {
  id: number;
  imageUrl: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  imageWidth: number | null;
  imageHeight: number | null;
  status: "completed" | "unavailable" | "failed";
  prediction: Prediction | null;
  confidencePercent: number | null;
  manipulationProbabilityPercent: number | null;
  modelMode: "live" | "demo" | "offline";
  modelName: string | null;
  modelVersion: string | null;
  analysisData: unknown;
  createdAt: Date;
}) {
  const data = (row.analysisData ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    imageUrl: row.imageUrl,
    filename: row.filename,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    status: row.status,
    prediction: row.prediction,
    confidencePercent: row.confidencePercent,
    manipulationProbabilityPercent: row.manipulationProbabilityPercent,
    modelMode: row.modelMode,
    modelName: row.modelName,
    modelVersion: row.modelVersion,
    evidence: (data.evidence ?? {}) as Record<string, unknown>,
    note: typeof data.note === "string" ? data.note : null,
    providerTimestamp: typeof data.providerTimestamp === "string" ? data.providerTimestamp : null,
    createdAt: row.createdAt,
  };
}

function unavailableResult(mode: "demo" | "offline", message: string) {
  return {
    status: "unavailable" as const,
    prediction: "unable_to_analyze" as const,
    confidencePercent: null,
    manipulationProbabilityPercent: null,
    modelMode: mode,
    modelName: mode === "demo" ? "Demo mode — no real ML inference" : "ML model unavailable",
    modelVersion: null,
    evidence: {},
    note: message,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  analysis: router({
    modelState: publicProcedure.query(() => getInferenceState()),
    submit: protectedProcedure
      .input(
        z.object({
          filename: z.string().trim().min(1).max(255),
          mimeType: z.enum(allowedImageMimeTypes),
          imageDataUrl: z.string().min(32).max(7_100_000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return submitImageAnalysis({ userId: ctx.user.id, filename: input.filename, mimeType: input.mimeType, imageBuffer: parseImageDataUrl(input.imageDataUrl, input.mimeType) });
      }),
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }))
      .query(async ({ ctx, input }) => {
        const rows = await listAnalysesByUserId(ctx.user.id, input.limit);
        return rows.map(analysisView);
      }),
    summary: protectedProcedure.query(async ({ ctx }) => {
      const rows = await listAnalysesByUserId(ctx.user.id, 200);
      const completed = rows.filter((row) => row.status === "completed");
      return {
        total: rows.length,
        providerScores: completed.filter((row) => row.prediction === null).length,
        unavailable: rows.filter((row) => row.status !== "completed").length,
        recent: rows.slice(0, 5).map(analysisView),
      };
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const row = await getAnalysisByIdForUser(input.id, ctx.user.id);
        return analysisView(requireOwnedAnalysis(row, ctx.user.id));
      }),
  }),
});

export type AppRouter = typeof appRouter;

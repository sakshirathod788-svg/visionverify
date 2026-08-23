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
import {
  getInferenceState,
  type InferenceResult,
  type Prediction,
  runLiveInference,
} from "./inference";
import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

function detectedMimeType(buffer: Buffer): (typeof allowedMimeTypes)[number] | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return undefined;
}

export function parseImageDataUrl(dataUrl: string, declaredMimeType: string): Buffer {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid JPG, PNG, or WEBP image." });
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Images must be 5 MB or smaller." });
  }

  const detected = detectedMimeType(buffer);
  if (!detected || detected !== match[1] || detected !== declaredMimeType) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The image contents do not match its declared file type." });
  }

  return buffer;
}

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
          mimeType: z.enum(allowedMimeTypes),
          imageDataUrl: z.string().min(32).max(7_100_000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const imageBuffer = parseImageDataUrl(input.imageDataUrl, input.mimeType);
        const filename = safeFilename(input.filename);
        const state = getInferenceState();
        let image;

        try {
          image = await storagePut(`visionverify/${ctx.user.id}/${filename}`, imageBuffer, input.mimeType);
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "VisionVerify could not securely store the selected image. Please try again.",
          });
        }

        if (state.mode !== "live") {
          const result = unavailableResult(state.mode, state.message);
          const id = await createAnalysis({
            userId: ctx.user.id,
            storageKey: image.key,
            imageUrl: image.url,
            filename,
            mimeType: input.mimeType,
            byteSize: imageBuffer.length,
            status: result.status,
            prediction: result.prediction,
            modelMode: result.modelMode,
            modelName: result.modelName,
            analysisData: { note: result.note },
          });
          return { id, ...result };
        }

        let inference: InferenceResult;
        try {
          inference = await runLiveInference({ buffer: imageBuffer, filename, mimeType: input.mimeType });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "ML model unavailable — no prediction generated.";
          const id = await createAnalysis({
            userId: ctx.user.id,
            storageKey: image.key,
            imageUrl: image.url,
            filename,
            mimeType: input.mimeType,
            byteSize: imageBuffer.length,
            status: "failed",
            prediction: "unable_to_analyze",
            modelMode: "live",
            modelName: "ML model unavailable",
            analysisData: { note: message },
          });
          return {
            id,
            status: "failed" as const,
            prediction: "unable_to_analyze" as const,
            confidencePercent: null,
            manipulationProbabilityPercent: null,
            modelMode: "live" as const,
            modelName: "ML model unavailable",
            modelVersion: null,
            evidence: {},
            note: message,
          };
        }

        const id = await createAnalysis({
          userId: ctx.user.id,
          storageKey: image.key,
          imageUrl: image.url,
          filename,
          mimeType: input.mimeType,
          byteSize: imageBuffer.length,
          status: "completed",
          prediction: null,
          confidencePercent: inference.confidencePercent,
          manipulationProbabilityPercent: inference.manipulationProbabilityPercent,
          modelMode: "live",
          modelName: inference.modelName,
          modelVersion: inference.modelVersion,
          analysisData: { evidence: inference.evidence, providerTimestamp: inference.providerTimestamp },
        });

        return {
          id,
          status: "completed" as const,
          prediction: null,
          modelMode: "live" as const,
          ...inference,
          note: null,
        };
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

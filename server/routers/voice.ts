import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";

export const voiceRouter = router({
  /**
   * Upload audio blob (base64) to S3 and return URL
   * Frontend: record with MediaRecorder, convert to base64, call this
   */
  uploadAudio: protectedProcedure
    .input(z.object({
      base64: z.string().max(22_000_000), // ~16MB raw audio
      mimeType: z.string().default("audio/webm"),
      durationSeconds: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const sizeMB = buffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Audio file exceeds 16MB limit" });
      }
      const ext = input.mimeType.split("/")[1]?.split(";")[0] ?? "webm";
      const key = `voice-messages/${ctx.user.id}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key, durationSeconds: input.durationSeconds ?? 0 };
    }),

  /**
   * Transcribe audio from URL using Whisper
   * Returns transcribed text to display in chat
   */
  transcribe: protectedProcedure
    .input(z.object({
      audioUrl: z.string().url(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: "Transcribe the voice message in a chat application",
      });

      if ("error" in result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
      };
    }),
});

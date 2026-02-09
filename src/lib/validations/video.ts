import { z } from "zod";

export const updateVideoSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  thumbnailUrl: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
});

export const videoUploadUrlSchema = z.object({
  maxDurationSeconds: z.number().int().min(1).max(3600).optional().default(600),
});

export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type VideoUploadUrlInput = z.infer<typeof videoUploadUrlSchema>;

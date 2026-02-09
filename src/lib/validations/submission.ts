import { z } from "zod";

export const createSubmissionSchema = z.object({
  assignmentId: z.string().min(1, "배정 ID를 입력해주세요."),
  versionSlot: z
    .number()
    .int()
    .min(1, "버전 슬롯은 1 이상이어야 합니다.")
    .max(5, "버전 슬롯은 5 이하여야 합니다."),
  versionTitle: z.string().trim().optional(),
  streamUid: z.string().min(1, "Stream UID를 입력해주세요."),
});

export const updateSubmissionSchema = z.object({
  versionTitle: z.string().trim().optional(),
});

export const uploadUrlSchema = z.object({
  maxDurationSeconds: z.number().int().min(1).max(3600).optional().default(600),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

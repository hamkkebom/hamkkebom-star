import { z } from "zod";

export const createFeedbackSchema = z
  .object({
    submissionId: z.string().min(1, "제출물 ID를 입력해주세요."),
    type: z
      .enum(["SUBTITLE", "BGM", "CUT_EDIT", "COLOR_GRADE", "GENERAL"])
      .default("GENERAL"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    content: z.string().trim().min(1, "피드백 내용을 입력해주세요."),
    startTime: z.number().nonnegative("시작 시간은 0 이상이어야 합니다.").optional(),
    endTime: z.number().nonnegative("종료 시간은 0 이상이어야 합니다.").optional(),
    annotation: z.any().optional(),
  })
  .refine(
    ({ startTime, endTime }) =>
      startTime === undefined || endTime === undefined || endTime >= startTime,
    {
      message: "종료 시간은 시작 시간 이후여야 합니다.",
      path: ["endTime"],
    }
  );

export const updateFeedbackSchema = z.object({
  content: z.string().trim().min(1).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  status: z.enum(["PENDING", "RESOLVED", "WONTFIX"]).optional(),
  annotation: z.any().optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;

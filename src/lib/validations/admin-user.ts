import { z } from "zod";

export const bulkApproveSchema = z.object({
  userIds: z
    .array(z.string().min(1, "유효한 사용자 ID가 필요합니다."))
    .min(1, "최소 1명을 선택해야 합니다.")
    .max(50, "한 번에 최대 50명까지 처리할 수 있습니다."),
  approved: z.boolean(),
  rejectionReason: z
    .string()
    .max(500, "반려 사유는 500자 이내로 입력해주세요.")
    .optional(),
});

export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;

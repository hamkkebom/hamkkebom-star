import { z } from "zod";

export const createReplySchema = z.object({
    content: z.string().trim().min(1, "답변 내용을 입력해주세요.").max(2000, "답변은 2000자 이내로 입력해주세요."),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

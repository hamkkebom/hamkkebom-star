import { z } from "zod";

const validDateString = z
  .string()
  .min(1, "마감일을 입력해주세요.")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "올바른 마감일을 입력해주세요.",
  });

const categorySchema = z.string().trim().min(1, "카테고리를 입력해주세요.");

const referenceUrlSchema = z.string().url("올바른 URL을 입력해주세요.");

export const createRequestSchema = z.object({
  title: z.string().trim().min(2, "제목은 2자 이상이어야 합니다."),
  categories: z.array(categorySchema).min(1, "카테고리를 1개 이상 입력해주세요."),
  deadline: validDateString,
  assignmentType: z.enum(["SINGLE", "MULTIPLE"]),
  maxAssignees: z
    .number()
    .int("담당자 수는 정수여야 합니다.")
    .min(1, "담당자 수는 1명 이상이어야 합니다.")
    .max(10, "담당자 수는 10명 이하여야 합니다."),
  estimatedBudget: z.number().nonnegative("예산은 0 이상이어야 합니다.").optional(),
  requirements: z.string().trim().optional(),
  referenceUrls: z.array(referenceUrlSchema).optional(),
});

export const updateRequestSchema = createRequestSchema.partial();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

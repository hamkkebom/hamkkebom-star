import { z } from "zod";

export const generateSettlementSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)"),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: "시작일은 종료일보다 이전이어야 합니다.", path: ["startDate"] }
);

export const adjustItemSchema = z.object({
  adjustedAmount: z.number().nonnegative("조정 금액은 0 이상이어야 합니다."),
});

export const updateSettlementConfigSchema = z.object({
  key: z.string().min(1, "키는 필수입니다."),
  value: z.string().min(0, "값은 필수입니다."),
});

export type GenerateSettlementInput = z.infer<typeof generateSettlementSchema>;
export type AdjustItemInput = z.infer<typeof adjustItemSchema>;
export type UpdateSettlementConfigInput = z.infer<typeof updateSettlementConfigSchema>;

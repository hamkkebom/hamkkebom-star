import { z } from "zod";

export const generateSettlementSchema = z.object({
  year: z.number().int().min(2020, "연도는 2020 이상이어야 합니다.").max(2100),
  month: z.number().int().min(1, "월은 1~12 사이여야 합니다.").max(12, "월은 1~12 사이여야 합니다."),
});

export const adjustItemSchema = z.object({
  adjustedAmount: z.number().nonnegative("조정 금액은 0 이상이어야 합니다."),
});

export type GenerateSettlementInput = z.infer<typeof generateSettlementSchema>;
export type AdjustItemInput = z.infer<typeof adjustItemSchema>;

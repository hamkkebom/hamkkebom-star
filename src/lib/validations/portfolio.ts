import { z } from "zod";

export const updatePortfolioSchema = z.object({
  bio: z.string().trim().optional(),
  showreel: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
  website: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
  socialLinks: z.record(z.string(), z.string()).nullable().optional(),
});

export const createPortfolioItemSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요."),
  description: z.string().trim().optional(),
  thumbnailUrl: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
  videoUrl: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
});

export const updatePortfolioItemSchema = createPortfolioItemSchema.partial();

export const reorderItemsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, "정렬할 항목 ID를 입력해주세요."),
});

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
export type CreatePortfolioItemInput = z.infer<typeof createPortfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;

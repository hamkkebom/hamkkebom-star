import { z } from "zod";

// BoardType enum matching Prisma
export const boardTypeEnum = z.enum(["FREE", "QNA", "TIPS", "SHOWCASE", "RECRUITMENT", "NOTICE"]);

/** 게시글 작성 */
export const createPostSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(100, "제목은 100자를 초과할 수 없습니다."),
  content: z.string().trim().min(10, "내용은 최소 10자 이상 입력해주세요."),
  boardType: boardTypeEnum.default("FREE"),
  tags: z.array(z.string().trim().max(30)).max(10).default([]),
  videoId: z.string().nullish(),
  contentJson: z.any().nullish(),
});

/** 게시글 수정 */
export const updatePostSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(100, "제목은 100자를 초과할 수 없습니다.").optional(),
  content: z.string().trim().min(10, "내용은 최소 10자 이상 입력해주세요.").optional(),
  boardType: boardTypeEnum.optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  videoId: z.string().nullish(),
  contentJson: z.any().nullish(),
  isPinned: z.boolean().optional(),
  isNotice: z.boolean().optional(),
});

/** 댓글 작성 */
export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(2000, "댓글은 2000자를 초과할 수 없습니다."),
  parentId: z.string().nullish(),
});

/** 댓글 수정 */
export const updateCommentSchema = z.object({
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(2000, "댓글은 2000자를 초과할 수 없습니다."),
});

// Type exports
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

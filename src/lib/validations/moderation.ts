import { z } from "zod";

// ── 신고 조치 ──

export const reportActionSchema = z
  .object({
    actionType: z.enum(
      [
        "DISMISS",
        "WARN",
        "HIDE_CONTENT",
        "REMOVE_CONTENT",
        "RESTRICT",
        "SUSPEND",
        "BAN",
      ],
      { message: "유효하지 않은 조치 유형입니다." }
    ),
    duration: z.number().int().min(1).max(365).optional(),
    reason: z
      .string()
      .trim()
      .min(2, "사유는 2자 이상이어야 합니다.")
      .max(500, "사유는 500자 이하여야 합니다."),
    internalNote: z.string().trim().max(1000).optional(),
    notifyUser: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (["RESTRICT", "SUSPEND"].includes(data.actionType)) {
        return data.duration !== undefined && data.duration > 0;
      }
      return true;
    },
    {
      message: "임시 제한/정지 시 기간을 입력해야 합니다.",
      path: ["duration"],
    }
  );

// ── 수동 제재 ──

export const manualSanctionSchema = z.object({
  userId: z.string().min(1, "사용자를 선택해야 합니다."),
  type: z.enum(
    [
      "WARNING",
      "CONTENT_HIDDEN",
      "CONTENT_REMOVED",
      "TEMP_RESTRICT",
      "TEMP_BAN",
      "PERM_BAN",
    ],
    { message: "유효하지 않은 제재 유형입니다." }
  ),
  reason: z
    .string()
    .trim()
    .min(2, "사유는 2자 이상이어야 합니다.")
    .max(500, "사유는 500자 이하여야 합니다."),
  duration: z.number().int().min(1).max(365).optional(),
  internalNote: z.string().trim().max(1000).optional(),
  notifyUser: z.boolean().default(true),
});

// ── 신고 일괄 처리 ──

export const reportBulkActionSchema = z.object({
  reportIds: z
    .array(z.string())
    .min(1, "최소 1개의 신고를 선택해야 합니다."),
  action: z.enum(["DISMISS", "ASSIGN", "ESCALATE"]),
  assignedTo: z.string().optional(),
  reason: z.string().trim().max(500).optional(),
});

// ── 게시글 상태 변경 ──

export const boardPostUpdateSchema = z.object({
  isHidden: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isNotice: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// ── 게시글 일괄 처리 ──

export const boardPostBulkSchema = z.object({
  postIds: z.array(z.string()).min(1, "최소 1개의 게시글을 선택해야 합니다."),
  action: z.enum(["HIDE", "UNHIDE", "PIN", "UNPIN", "DELETE"]),
});

// ── 댓글 일괄 처리 ──

export const commentBulkSchema = z.object({
  commentIds: z.array(z.string()).min(1, "최소 1개의 댓글을 선택해야 합니다."),
  action: z.enum(["HIDE", "UNHIDE", "DELETE"]),
});

// ── 제재 해제 ──

export const sanctionRevokeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(2, "해제 사유는 2자 이상이어야 합니다.")
    .max(500),
});

// ── Type exports ──

export type ReportActionInput = z.infer<typeof reportActionSchema>;
export type ManualSanctionInput = z.infer<typeof manualSanctionSchema>;
export type ReportBulkActionInput = z.infer<typeof reportBulkActionSchema>;
export type BoardPostUpdateInput = z.infer<typeof boardPostUpdateSchema>;
export type BoardPostBulkInput = z.infer<typeof boardPostBulkSchema>;
export type CommentBulkInput = z.infer<typeof commentBulkSchema>;
export type SanctionRevokeInput = z.infer<typeof sanctionRevokeSchema>;

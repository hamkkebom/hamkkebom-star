"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Film,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Save,
  ExternalLink,
  Tag,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { GlowBadge } from "@/components/settlement/glow-badge";
import { NumberTicker } from "@/components/settlement/number-ticker";
import { formatKRW, formatDateRange } from "@/lib/settlement-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

const STATUS_GLOW_MAP: Record<string, { label: string; variant: GlowVariant }> = {
  PENDING: { label: "대기중", variant: "pending" },
  PROCESSING: { label: "처리중", variant: "processing" },
  COMPLETED: { label: "완료", variant: "completed" },
  FAILED: { label: "실패", variant: "failed" },
};

export type SettlementDetail = {
  id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
  paymentDate: string | null;
  note: string | null;
  star: {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
    phone: string | null;
    baseRate: number | null;
    idNumber: string | null;
    bankName: string | null;
    bankAccount: string | null;
    aiToolSupportFee: number | null;
  };
  items: Array<{
    id: string;
    baseAmount: number;
    adjustedAmount: number | null;
    finalAmount: number;
    description: string | null;
    itemType: string;
    submission: {
      id: string;
      versionTitle: string | null;
      version: string;
      status: string;
      createdAt: string;
      video: {
        id: string;
        title: string;
        customRate: number | null;
      } | null;
    } | null;
  }>;
};

export interface SettlementDetailSheetProps {
  detail: SettlementDetail | undefined;
  detailLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutate: () => void;
  onRequestConfirm: () => void;
  onRequestCancel: () => void;
}

// ---------------------------------------------------------------------------
// Version warning detection
// ---------------------------------------------------------------------------

// 제목 끝의 수정본·버전 관련 접미사를 제거해 base title 추출
const REVISION_SUFFIX_RE =
  /(\s+(\d+차\s*)?(수정본|수정|v\d+|재제출|개선본|보완본|재업))+$/i;

function normalizeTitle(title: string): string {
  return title.replace(REVISION_SUFFIX_RE, "").trim();
}

type VersionWarning =
  | { type: "revision_of"; baseTitle: string }
  | { type: "has_revision"; revTitle: string }
  | { type: "keyword" };

function detectVersionWarnings(
  items: SettlementDetail["items"]
): Map<string, VersionWarning> {
  const warnings = new Map<string, VersionWarning>();
  // title → itemId (SUBMISSION 타입만)
  const titleToId = new Map<string, string>();
  for (const item of items) {
    if (item.itemType === "AI_TOOL_SUPPORT") continue;
    const title = item.submission?.video?.title ?? item.submission?.versionTitle;
    if (title) titleToId.set(title, item.id);
  }
  for (const item of items) {
    if (item.itemType === "AI_TOOL_SUPPORT") continue;
    const title = item.submission?.video?.title ?? item.submission?.versionTitle;
    if (!title) continue;
    const baseTitle = normalizeTitle(title);
    if (baseTitle === title) continue; // 수정본 키워드 없음
    const baseItemId = titleToId.get(baseTitle);
    if (baseItemId) {
      warnings.set(item.id, { type: "revision_of", baseTitle });
      if (!warnings.has(baseItemId)) {
        warnings.set(baseItemId, { type: "has_revision", revTitle: title });
      }
    } else {
      warnings.set(item.id, { type: "keyword" });
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettlementDetailSheet({
  detail,
  detailLoading,
  open,
  onOpenChange,
  onMutate,
  onRequestConfirm,
  onRequestCancel,
}: SettlementDetailSheetProps) {

  // Note editing state
  const [noteEdit, setNoteEdit] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  // Adjusted amount inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");

  // 버전 미등록 수정본 감지
  const versionWarnings = useMemo(
    () => detectVersionWarnings(detail?.items ?? []),
    [detail?.items]
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("메모 저장에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("메모가 저장되었습니다.");
      setNoteEdit(false);
      onMutate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "메모 저장에 실패했습니다."),
  });

  const updateAiFeeMutation = useMutation({
    mutationFn: async ({ userId, aiToolSupportFee }: { userId: string; aiToolSupportFee: number | null }) => {
      const res = await fetch(`/api/admin/users/${userId}/ai-tool-fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiToolSupportFee }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "개인 지원비 설정에 실패했습니다.");
      }
    },
    onSuccess: () => {
      toast.success("AI 툴 개인 지원비가 저장되었습니다. 정산을 재생성하면 반영됩니다.");
      onMutate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "개인 지원비 설정에 실패했습니다."),
  });

  const updateVideoRateMutation = useMutation({
    mutationFn: async ({ videoId, customRate }: { videoId: string; customRate: number | null }) => {
      const res = await fetch(`/api/videos/${videoId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customRate }),
      });
      if (!res.ok) throw new Error("영상 단가 설정에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("영상 단가가 저장되었습니다. 정산을 재생성하면 반영됩니다.");
      onMutate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "영상 단가 설정에 실패했습니다."),
  });

  const updateAdjustedAmountMutation = useMutation({
    mutationFn: async ({ settlementId, itemId, adjustedAmount }: { settlementId: string; itemId: string; adjustedAmount: number }) => {
      const res = await fetch(`/api/settlements/${settlementId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustedAmount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "금액 수정에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("금액이 수정되었습니다.");
      setEditingItemId(null);
      setEditingAmount("");
      onMutate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "금액 수정에 실패했습니다."),
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------



  const handleStartNoteEdit = useCallback(() => {
    setNoteValue(detail?.note ?? "");
    setNoteEdit(true);
  }, [detail?.note]);

  const handleSaveNote = useCallback(() => {
    if (detail) updateNoteMutation.mutate({ id: detail.id, note: noteValue });
  }, [detail, noteValue, updateNoteMutation]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {detail ? `${formatDateRange(new Date(detail.startDate), new Date(detail.endDate))} 정산` : "정산 상세"}
          </SheetTitle>
        </SheetHeader>

        {detailLoading || !detail ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* STAR Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">STAR 정보</h4>
              <Card>
                <CardContent className="p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">이름</span>
                    <span className="font-medium">
                      {detail.star.name}
                      {detail.star.chineseName && <span className="text-muted-foreground text-xs ml-1.5 font-normal">({detail.star.chineseName})</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">이메일</span>
                    <span>{detail.star.email}</span>
                  </div>
                  {detail.star.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">연락처</span>
                      <span>{detail.star.phone}</span>
                    </div>
                  )}
                  {detail.star.idNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">주민번호</span>
                      <span className="font-mono text-xs">{detail.star.idNumber}</span>
                    </div>
                  )}
                  {detail.star.bankName && detail.star.bankAccount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">계좌</span>
                      <span>{detail.star.bankName} {detail.star.bankAccount}</span>
                    </div>
                  )}
                  {detail.star.baseRate !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">기본 단가</span>
                      <span className="tabular-nums">{formatKRW(Number(detail.star.baseRate))}</span>
                    </div>
                  )}
                  {/* AI 툴 개인 지원비 설정 */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-dashed">
                    <span className="text-muted-foreground">AI 툴 지원비</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        placeholder="전역 설정 사용"
                        defaultValue={detail.star.aiToolSupportFee !== null ? Number(detail.star.aiToolSupportFee) : ""}
                        className="h-7 text-xs w-[120px] text-right tabular-nums"
                        key={`ai-fee-${detail.star.id}-${detail.star.aiToolSupportFee}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            updateAiFeeMutation.mutate({
                              userId: detail.star.id,
                              aiToolSupportFee: val ? Number(val) : null,
                            });
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={(e) => {
                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                          const val = input?.value;
                          updateAiFeeMutation.mutate({
                            userId: detail.star.id,
                            aiToolSupportFee: val ? Number(val) : null,
                          });
                        }}
                        disabled={updateAiFeeMutation.isPending}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        저장
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">정산 요약</h4>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <GlowBadge
                      label={STATUS_GLOW_MAP[detail.status]?.label ?? detail.status}
                      variant={STATUS_GLOW_MAP[detail.status]?.variant ?? "pending"}
                      size="md"
                    />
                    <NumberTicker value={Number(detail.totalAmount)} suffix="원" className="text-xl font-bold" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {detail.items.length}개 항목 &middot;{" "}
                    {detail.paymentDate
                      ? `지급일: ${new Intl.DateTimeFormat("ko-KR").format(new Date(detail.paymentDate))}`
                      : "지급일 미정"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">정산 항목 ({detail.items.length})</h4>
              <div className="space-y-2">
                {detail.items.map((item) => {
                  const videoTitle = item.submission?.video?.title;
                  const videoId = item.submission?.video?.id;
                  const videoCustomRate = item.submission?.video?.customRate;
                  const submissionId = item.submission?.id;
                  const isClickable = !!submissionId;
                  const hasCustomRate = videoCustomRate !== null && videoCustomRate !== undefined;
                  const displayTitle = item.description
                    ?? (item.itemType === "AI_TOOL_SUPPORT"
                      ? "AI 툴 지원비"
                      : videoTitle ?? item.submission?.versionTitle ?? "작품료");

                  const versionWarning = versionWarnings.get(item.id);

                  return (
                    <Card
                      key={item.id}
                      className={isClickable ? "transition-all hover:border-violet-400/60 hover:shadow-md hover:shadow-violet-500/5 group" : ""}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            {item.itemType !== "AI_TOOL_SUPPORT" && (
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                <Film className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p
                                  className={`text-sm font-medium truncate ${isClickable ? "cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" : ""}`}
                                  onClick={() => {
                                    if (isClickable) {
                                      window.open(`/admin/reviews/${submissionId}`, "_blank");
                                    }
                                  }}
                                >
                                  {displayTitle}
                                </p>
                                {isClickable && (
                                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {item.submission && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.submission.version} · {new Intl.DateTimeFormat("ko-KR").format(new Date(item.submission.createdAt))}
                                  </p>
                                )}
                                {hasCustomRate && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                                    <Tag className="h-2.5 w-2.5" />
                                    영상 단가
                                  </span>
                                )}
                                {versionWarning && (
                                  <span
                                    title={
                                      versionWarning.type === "revision_of"
                                        ? `"${versionWarning.baseTitle}" 의 수정본으로 보입니다`
                                        : versionWarning.type === "has_revision"
                                        ? `"${versionWarning.revTitle}" 이(가) 수정본으로 보입니다`
                                        : "제목에 수정본 키워드가 포함되어 있습니다"
                                    }
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full cursor-help"
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {versionWarning.type === "revision_of"
                                      ? "수정본 의심"
                                      : versionWarning.type === "has_revision"
                                      ? "수정본 있음"
                                      : "수정본 의심"}
                                  </span>
                                )}
                              </div>
                              {/* 영상 단가 설정 UI */}
                              {videoId && item.itemType !== "AI_TOOL_SUPPORT" && (
                                <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    placeholder="영상 단가 (미설정 시 기본)"
                                    defaultValue={hasCustomRate ? Number(videoCustomRate) : ""}
                                    className="h-7 text-xs w-[160px]"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const val = (e.target as HTMLInputElement).value;
                                        updateVideoRateMutation.mutate({
                                          videoId,
                                          customRate: val ? Number(val) : null,
                                        });
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                      const val = input?.value;
                                      updateVideoRateMutation.mutate({
                                        videoId,
                                        customRate: val ? Number(val) : null,
                                      });
                                    }}
                                    disabled={updateVideoRateMutation.isPending}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    저장
                                  </Button>
                                </div>
                              )}

                              {/* AI 툴 개인별 지원비 설정 UI */}
                              {item.itemType === "AI_TOOL_SUPPORT" && (
                                <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    placeholder="개인 지원비 (비우면 전역 설정)"
                                    defaultValue={detail.star.aiToolSupportFee !== null ? Number(detail.star.aiToolSupportFee) : ""}
                                    className="h-7 text-xs w-[180px]"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const val = (e.target as HTMLInputElement).value;
                                        updateAiFeeMutation.mutate({
                                          userId: detail.star.id,
                                          aiToolSupportFee: val ? Number(val) : null,
                                        });
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                      const val = input?.value;
                                      updateAiFeeMutation.mutate({
                                        userId: detail.star.id,
                                        aiToolSupportFee: val ? Number(val) : null,
                                      });
                                    }}
                                    disabled={updateAiFeeMutation.isPending}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    저장
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                            {editingItemId === item.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={editingAmount}
                                  onChange={(e) => setEditingAmount(e.target.value)}
                                  className="h-7 text-xs w-[100px] tabular-nums"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && editingAmount && detail) {
                                      updateAdjustedAmountMutation.mutate({
                                        settlementId: detail.id,
                                        itemId: item.id,
                                        adjustedAmount: Number(editingAmount),
                                      });
                                    }
                                    if (e.key === "Escape") {
                                      setEditingItemId(null);
                                      setEditingAmount("");
                                    }
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    if (editingAmount && detail) {
                                      updateAdjustedAmountMutation.mutate({
                                        settlementId: detail.id,
                                        itemId: item.id,
                                        adjustedAmount: Number(editingAmount),
                                      });
                                    }
                                  }}
                                  disabled={updateAdjustedAmountMutation.isPending || !editingAmount}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditingItemId(null);
                                    setEditingAmount("");
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-semibold tabular-nums">{formatKRW(Number(item.finalAmount))}</p>
                                {(detail.status === "PENDING" || detail.status === "PROCESSING") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setEditingAmount(String(item.adjustedAmount !== null ? Number(item.adjustedAmount) : Number(item.finalAmount)));
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                            {item.adjustedAmount !== null && Number(item.adjustedAmount) !== Number(item.baseAmount) && (
                              <p className="text-xs text-muted-foreground line-through tabular-nums">{formatKRW(Number(item.baseAmount))}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">메모</h4>
                {!noteEdit && (
                  <Button variant="ghost" size="sm" onClick={handleStartNoteEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {noteEdit ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="메모를 입력하세요..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNote} disabled={updateNoteMutation.isPending}>
                      {updateNoteMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNoteEdit(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{detail.note || "메모가 없습니다."}</p>
              )}
            </div>

            {/* Actions */}
            <Separator />
            <div className="flex gap-2">
              {(detail.status === "PENDING" || detail.status === "PROCESSING") && (
                <Button
                  className="flex-1 gap-1.5"
                  onClick={onRequestConfirm}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  확정
                </Button>
              )}
              {detail.status === "COMPLETED" && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  onClick={onRequestCancel}
                >
                  <Undo2 className="h-4 w-4" />
                  확정 취소
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

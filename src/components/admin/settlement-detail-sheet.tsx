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
  Sparkles,
  Loader2,
  Trash2,
  Check,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        thumbnailPhash: string | null;
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

type VersionWarning = {
  // 제목 기반 매칭
  titleType?: "revision_of" | "has_revision" | "keyword";
  titleRelated?: string; // 관련 영상 제목 (있으면)
  // 썸네일 pHash 기반 매칭
  similarThumbnail?: { itemId: string; itemTitle: string; distance: number };
};

const PHASH_THRESHOLD = 12; // Hamming distance ≤ 12 → 시각적으로 매우 유사
const HASH_HEX_LEN = 16;

function hexToBin(hex: string): string {
  let bin = "";
  for (const c of hex) bin += parseInt(c, 16).toString(2).padStart(4, "0");
  return bin;
}

function hammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return 64;
  const a = hexToBin(hexA);
  const b = hexToBin(hexB);
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function minPhashDistance(phashA: string, phashB: string): number {
  const arrA = phashA.split(",").filter((s) => s.length === HASH_HEX_LEN);
  const arrB = phashB.split(",").filter((s) => s.length === HASH_HEX_LEN);
  if (arrA.length === 0 || arrB.length === 0) return 64;
  let min = 64;
  for (const a of arrA) for (const b of arrB) {
    const d = hammingDistance(a, b);
    if (d < min) min = d;
  }
  return min;
}

function detectVersionWarnings(
  items: SettlementDetail["items"]
): Map<string, VersionWarning> {
  const warnings = new Map<string, VersionWarning>();
  const ensure = (id: string): VersionWarning => {
    let w = warnings.get(id);
    if (!w) {
      w = {};
      warnings.set(id, w);
    }
    return w;
  };

  // ── 제목 기반 매칭 ──
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
    if (baseTitle === title) continue;
    const baseItemId = titleToId.get(baseTitle);
    if (baseItemId) {
      ensure(item.id).titleType = "revision_of";
      ensure(item.id).titleRelated = baseTitle;
      const baseW = ensure(baseItemId);
      if (!baseW.titleType) {
        baseW.titleType = "has_revision";
        baseW.titleRelated = title;
      }
    } else {
      ensure(item.id).titleType = "keyword";
    }
  }

  // ── 썸네일 pHash 기반 매칭 ──
  type PhashEntry = { itemId: string; title: string; phash: string };
  const phashEntries: PhashEntry[] = [];
  for (const item of items) {
    if (item.itemType === "AI_TOOL_SUPPORT") continue;
    const phash = item.submission?.video?.thumbnailPhash;
    const title = item.submission?.video?.title ?? item.submission?.versionTitle ?? "";
    if (phash && title) {
      phashEntries.push({ itemId: item.id, title, phash });
    }
  }
  // 모든 쌍 비교
  for (let i = 0; i < phashEntries.length; i++) {
    for (let j = i + 1; j < phashEntries.length; j++) {
      const a = phashEntries[i];
      const b = phashEntries[j];
      const dist = minPhashDistance(a.phash, b.phash);
      if (dist <= PHASH_THRESHOLD) {
        const wa = ensure(a.itemId);
        const wb = ensure(b.itemId);
        // 가장 가까운 것만 유지
        if (!wa.similarThumbnail || dist < wa.similarThumbnail.distance) {
          wa.similarThumbnail = { itemId: b.itemId, itemTitle: b.title, distance: dist };
        }
        if (!wb.similarThumbnail || dist < wb.similarThumbnail.distance) {
          wb.similarThumbnail = { itemId: a.itemId, itemTitle: a.title, distance: dist };
        }
      }
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

  // 항목 삭제 확인 state
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // 버전 미등록 수정본 감지
  const versionWarnings = useMemo(
    () => detectVersionWarnings(detail?.items ?? []),
    [detail?.items]
  );

  // 중복 항목 감지 (같은 submissionId가 2개 이상)
  const duplicateItemIds = useMemo(() => {
    const seen = new Map<string, string>();
    const dupes = new Set<string>();
    for (const item of detail?.items ?? []) {
      const sid = item.submission?.id;
      if (!sid) continue;
      if (seen.has(sid)) {
        dupes.add(item.id);
        dupes.add(seen.get(sid)!);
      } else {
        seen.set(sid, item.id);
      }
    }
    return dupes;
  }, [detail?.items]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const computePhashMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      const res = await fetch(`/api/admin/videos/compute-phash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "썸네일 hash 계산 실패");
      return json.data as {
        processed: number;
        failed: number;
        total: number;
        errors?: string[];
        message: string;
      };
    },
    onSuccess: (data) => {
      const description = data.errors && data.errors.length > 0
        ? data.errors.join("\n") + (data.failed > data.errors.length ? `\n…외 ${data.failed - data.errors.length}건` : "")
        : undefined;
      if (data.failed > 0 && data.processed === 0) {
        toast.error(data.message, {
          id: "phash-progress",
          description: description ?? "콘솔에서 자세한 오류를 확인하세요.",
          duration: 12000,
        });
      } else if (data.failed > 0) {
        toast.warning(data.message, {
          id: "phash-progress",
          description,
          duration: 10000,
        });
      } else {
        toast.success(data.message, { id: "phash-progress" });
      }
      onMutate();
    },
    onError: (err: Error) =>
      toast.error(err.message, {
        id: "phash-progress",
        description: "네트워크 오류 또는 서버 오류일 수 있습니다. 잠시 후 다시 시도하세요.",
        duration: 10000,
      }),
  });

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

  const deleteItemMutation = useMutation({
    mutationFn: async ({ settlementId, itemId }: { settlementId: string; itemId: string }) => {
      const res = await fetch(`/api/settlements/${settlementId}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "항목 삭제에 실패했습니다.");
      }
    },
    onSuccess: () => {
      toast.success("항목이 삭제되었습니다.");
      setDeletingItemId(null);
      onMutate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "항목 삭제에 실패했습니다."),
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
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-muted-foreground">정산 항목 ({detail.items.length})</h4>
                {(() => {
                  const missingPhash = detail.items.filter(
                    (it) =>
                      it.itemType !== "AI_TOOL_SUPPORT" &&
                      it.submission?.video &&
                      !it.submission.video.thumbnailPhash
                  ).length;
                  if (missingPhash === 0) return null;
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={computePhashMutation.isPending}
                            onClick={() => {
                              toast.loading(
                                `${missingPhash}개 영상 썸네일 분석 중...`,
                                {
                                  id: "phash-progress",
                                  description: `영상당 약 3~6초 소요됩니다. 예상 시간: 최대 ${Math.ceil(missingPhash * 6)}초`,
                                  duration: Infinity,
                                }
                              );
                              computePhashMutation.mutate(detail.id);
                            }}
                          >
                            {computePhashMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                분석 중...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                썸네일 분석 ({missingPhash}개)
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          align="end"
                          className="max-w-[240px] p-3 space-y-2 text-left"
                        >
                          <p className="font-semibold text-xs leading-tight">썸네일로 중복 영상을 감지합니다</p>
                          <div className="space-y-1.5 pt-0.5">
                            {(
                              [
                                ["1", "프레임 캡처", "영상의 5개 시점에서 이미지를 가져옵니다"],
                                ["2", "지문 생성", "각 프레임을 64-bit 해시로 압축합니다"],
                                ["3", "전체 비교", "정산 내 모든 영상 지문을 교차 비교합니다"],
                                ["4", "배지 표시", "유사 영상 카드에 '썸네일 유사' 배지가 붙습니다"],
                              ] as const
                            ).map(([num, title, desc]) => (
                              <div key={num} className="flex gap-2 items-start">
                                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/30 text-[10px] font-bold leading-none">
                                  {num}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-medium text-[11px]">{title}</span>
                                  <span className="block text-[10px] opacity-70 leading-tight">{desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
              </div>
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
                                {versionWarning?.titleType && (
                                  <span
                                    title={
                                      versionWarning.titleType === "revision_of"
                                        ? `"${versionWarning.titleRelated}" 의 수정본으로 보입니다`
                                        : versionWarning.titleType === "has_revision"
                                        ? `"${versionWarning.titleRelated}" 이(가) 수정본으로 보입니다`
                                        : "제목에 수정본 키워드가 포함되어 있습니다"
                                    }
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full cursor-help"
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {versionWarning.titleType === "revision_of"
                                      ? "제목 수정본 의심"
                                      : versionWarning.titleType === "has_revision"
                                      ? "수정본 있음"
                                      : "수정본 키워드"}
                                  </span>
                                )}
                                {versionWarning?.similarThumbnail && (
                                  <span
                                    title={`"${versionWarning.similarThumbnail.itemTitle}" 와(과) 썸네일이 매우 비슷합니다 (Hamming distance: ${versionWarning.similarThumbnail.distance})`}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full cursor-help"
                                  >
                                    <Film className="h-2.5 w-2.5" />
                                    썸네일 유사 ({versionWarning.similarThumbnail.distance})
                                  </span>
                                )}
                                {duplicateItemIds.has(item.id) && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    중복
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
                                  deletingItemId === item.id ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-destructive hover:text-destructive"
                                        onClick={() => deleteItemMutation.mutate({ settlementId: detail.id, itemId: item.id })}
                                        disabled={deleteItemMutation.isPending}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => setDeletingItemId(null)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
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
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                        onClick={() => setDeletingItemId(item.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )
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

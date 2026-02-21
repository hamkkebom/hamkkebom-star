"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Pencil, Trash2, X, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";

type FeedbackType = "SUBTITLE" | "BGM" | "CUT_EDIT" | "COLOR_GRADE" | "GENERAL";
type FeedbackPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type FeedbackItem = {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  content: string;
  startTime: number | null;
  endTime: number | null;
  status: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

interface FeedbackListProps {
  submissionId: string;
  onTimecodeClick?: (time: number) => void;
  onFeedbacksChanged?: () => void;
}

const typeLabels: Record<FeedbackType, string> = {
  GENERAL: "일반",
  SUBTITLE: "자막",
  BGM: "BGM",
  CUT_EDIT: "컷편집",
  COLOR_GRADE: "색보정",
};

const priorityVariants: Record<FeedbackPriority, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "outline",
  NORMAL: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

const priorityLabels: Record<FeedbackPriority, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function fetchFeedbacks(submissionId: string): Promise<FeedbackItem[]> {
  const response = await fetch(`/api/feedbacks?submissionId=${submissionId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("피드백 목록을 불러오지 못했습니다.");
  }

  const json = (await response.json()) as { data: FeedbackItem[] };
  return json.data;
}

export function FeedbackList({ submissionId, onTimecodeClick, onFeedbacksChanged }: FeedbackListProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["feedbacks", submissionId],
    queryFn: () => fetchFeedbacks(submissionId),
    refetchInterval: false,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("수정에 실패했습니다.");
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["feedbacks", submissionId] });
      toast.success("피드백이 수정되었습니다.");
      onFeedbacksChanged?.();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "수정 실패"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/feedbacks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      return res.json();
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["feedbacks", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["submission-detail"] });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("피드백이 삭제되었습니다.");
      onFeedbacksChanged?.();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "삭제 실패"),
  });

  const startEditing = (feedback: FeedbackItem) => {
    setEditingId(feedback.id);
    setEditContent(feedback.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEditing = (id: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({ id, content: editContent.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={`feedback-skeleton-${i}`} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
        {error instanceof Error ? error.message : "피드백 목록을 불러오지 못했습니다."}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        아직 피드백이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((feedback) => (
        <div key={feedback.id} className="rounded-xl border bg-card p-4 relative group/item">
          {/* Header: Badges + Actions */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{typeLabels[feedback.type]}</Badge>
              <Badge variant={priorityVariants[feedback.priority]}>
                {priorityLabels[feedback.priority]}
              </Badge>
              {feedback.startTime !== null && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-primary hover:bg-muted/80"
                  onClick={() => {
                    if (feedback.startTime !== null) {
                      onTimecodeClick?.(feedback.startTime);
                    }
                  }}
                >
                  ⏱ {formatTimecode(feedback.startTime)}
                  {feedback.endTime !== null && ` → ${formatTimecode(feedback.endTime)}`}
                </button>
              )}
            </div>

            {/* Edit / Delete Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEditing(feedback)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeletingId(feedback.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content: Edit Mode or Display Mode */}
          {editingId === feedback.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={updateMutation.isPending}
                >
                  <X className="mr-1 h-3 w-3" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveEditing(feedback.id)}
                  disabled={updateMutation.isPending || !editContent.trim()}
                >
                  <Check className="mr-1 h-3 w-3" />
                  {updateMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm leading-6">{feedback.content}</p>
          )}

          {/* Delete Confirmation */}
          {deletingId === feedback.id && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive flex-1">이 피드백을 삭제하시겠습니까?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingId(null)}
                disabled={deleteMutation.isPending}
                className="h-7 text-xs"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(feedback.id)}
                disabled={deleteMutation.isPending}
                className="h-7 text-xs"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{feedback.author.name}</span>
            <span>•</span>
            <span>{formatDate(feedback.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

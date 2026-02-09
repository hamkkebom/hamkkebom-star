"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

export function FeedbackList({ submissionId, onTimecodeClick }: FeedbackListProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["feedbacks", submissionId],
    queryFn: () => fetchFeedbacks(submissionId),
    refetchInterval: 10_000,
  });

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
        <div key={feedback.id} className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
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

          <p className="whitespace-pre-line text-sm leading-6">{feedback.content}</p>

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

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type FeedbackType = "SUBTITLE" | "BGM" | "CUT_EDIT" | "COLOR_GRADE" | "GENERAL";
type FeedbackPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type FeedbackWithSubmission = {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  content: string;
  startTime: number | null;
  status: string;
  createdAt: string;
  author: {
    name: string;
  };
  submission: {
    id: string;
    versionTitle: string | null;
    version: string;
    assignment: {
      request: {
        title: string;
      };
    };
  };
};

type MySubmission = {
  id: string;
  versionTitle: string | null;
  version: string;
  assignment: {
    request: {
      title: string;
    };
  };
  feedbacks: FeedbackWithSubmission[];
  _count: {
    feedbacks: number;
  };
};

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
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

async function fetchMySubmissionsWithFeedback(): Promise<MySubmission[]> {
  const res = await fetch("/api/submissions/my?page=1&pageSize=50", { cache: "no-store" });
  if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
  const json = (await res.json()) as { data: MySubmission[] };
  return json.data;
}

export default function FeedbackPage() {
  const { data: submissions, isLoading, isError, error } = useQuery({
    queryKey: ["my-submissions-feedback"],
    queryFn: fetchMySubmissionsWithFeedback,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">피드백 확인</h1>
        <p className="text-sm text-muted-foreground">
          제출한 영상에 대한 피드백을 확인하세요.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`fb-skeleton-${i}`} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "피드백을 불러오지 못했습니다."}
        </div>
      ) : !submissions?.length ? (
        <div className="rounded-xl border border-dashed px-4 py-14 text-center">
          <h3 className="mb-1 text-lg font-semibold">제출물이 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            먼저 영상을 업로드하여 제출물을 등록해 주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/stars/my-videos/${sub.id}`} className="hover:underline">
                    <CardTitle className="text-base">
                      {sub.versionTitle || `v${sub.version}`}
                    </CardTitle>
                  </Link>
                  <Badge variant="outline">
                    피드백 {sub._count.feedbacks}개
                  </Badge>
                </div>
                <CardDescription className="line-clamp-1">
                  {sub?.assignment?.request?.title ?? '제목 없음'}
                </CardDescription>
              </CardHeader>
              {sub._count.feedbacks > 0 && (
                <CardContent>
                  <FeedbackItems submissionId={sub.id} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackItems({ submissionId }: { submissionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["feedbacks", submissionId],
    queryFn: async () => {
      const res = await fetch(`/api/feedbacks?submissionId=${submissionId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("피드백 로딩 실패");
      const json = (await res.json()) as { data: FeedbackWithSubmission[] };
      return json.data;
    },
  });

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!data?.length) return null;

  return (
    <div className="space-y-2">
      {data.map((fb) => (
        <div key={fb.id} className="rounded-lg bg-muted/50 p-3">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">{typeLabels[fb.type]}</Badge>
            <Badge variant={priorityVariants[fb.priority]} className="text-xs">
              {priorityLabels[fb.priority]}
            </Badge>
            {fb.startTime !== null && (
              <span className="text-xs tabular-nums text-primary">
                ⏱ {formatTimecode(fb.startTime)}
              </span>
            )}
          </div>
          <p className="text-sm leading-6">{fb.content}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fb.author.name} • {formatDate(fb.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

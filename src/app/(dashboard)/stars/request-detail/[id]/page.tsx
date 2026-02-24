"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Users, DollarSign, CheckCircle } from "lucide-react";

type Assignment = {
  id: string;
  status: string;
  createdAt: string;
  star: { id: string; name: string; email: string; avatarUrl: string | null };
};

type RequestDetail = {
  id: string;
  title: string;
  categories: string[];
  deadline: string;
  assignmentType: string;
  maxAssignees: number;
  estimatedBudget: number | null;
  requirements: string | null;
  referenceUrls: string[];
  status: string;
  currentAssignees: number;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  assignments: Assignment[];
};

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  FULL: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CLOSED: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  OPEN: "모집중",
  FULL: "정원마감",
  CLOSED: "마감",
  CANCELLED: "취소",
};

const assignmentStatusLabels: Record<string, string> = {
  PENDING_APPROVAL: "승인 대기",
  ACCEPTED: "수락됨",
  IN_PROGRESS: "작업중",
  SUBMITTED: "제출됨",
  COMPLETED: "완료",
  CANCELLED: "취소",
  REJECTED: "거절됨",
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ data: RequestDetail }>({
    queryKey: ["request-detail", id],
    queryFn: () => fetch(`/api/projects/requests/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/requests/${id}/accept`, { method: "POST" }).then(async (r) => {
        if (!r.ok) {
          const body = await r.json();
          throw new Error(body.error?.message || "수락 실패");
        }
        return r.json();
      }),
    onSuccess: () => {
      toast.success("지원이 완료되었습니다! 관리자 승인 후 작업을 시작할 수 있습니다.");
      queryClient.invalidateQueries({ queryKey: ["request-detail", id] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">요청을 찾을 수 없습니다.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로가기
        </Button>
      </div>
    );
  }

  const req = data.data;
  const deadline = new Date(req.deadline);
  const isExpired = deadline < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{req.title}</h1>
          <p className="text-sm text-muted-foreground">
            {req.createdBy.name} · {new Date(req.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <Badge className={statusColors[req.status] || ""}>
          {statusLabels[req.status] || req.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">마감일</p>
              <p className={`text-sm font-medium ${isExpired ? "text-red-500" : ""}`}>
                {deadline.toLocaleDateString("ko-KR")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">참여</p>
              <p className="text-sm font-medium">
                {req.currentAssignees} / {req.maxAssignees}명
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">예산</p>
              <p className="text-sm font-medium">
                {req.estimatedBudget
                  ? `₩${Number(req.estimatedBudget).toLocaleString()}`
                  : "미정"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">배정방식</p>
              <p className="text-sm font-medium">
                {req.assignmentType === "SINGLE" ? "단일" : "다중"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {req.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {req.categories.map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>
      )}

      {/* Requirements */}
      {req.requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">제작 가이드라인</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{req.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Reference URLs */}
      {req.referenceUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">참고 자료</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {req.referenceUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:underline dark:text-blue-400 truncate"
              >
                {url}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Accept Button */}
      {req.status === "OPEN" && (
        <Button
          onClick={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending}
          className="w-full"
          size="lg"
        >
          {acceptMutation.isPending ? "지원 중..." : "이 프로젝트 지원하기"}
        </Button>
      )}

      {/* Assignees */}
      {req.assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">수락한 STAR</CardTitle>
            <CardDescription>{req.assignments.length}명이 참여 중</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {req.assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                  {a.star.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.star.name}</p>
                </div>
                <Badge variant="outline" className="text-xs">{assignmentStatusLabels[a.status] || a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

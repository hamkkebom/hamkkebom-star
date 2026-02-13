"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Phone, DollarSign, Film, FileText, Calendar } from "lucide-react";
import { useState } from "react";

type Assignment = {
  id: string;
  status: string;
  createdAt: string;
  request: { id: string; title: string; deadline: string; status: string };
};

type Settlement = {
  id: string;
  year: number;
  month: number;
  totalAmount: number;
  status: string;
};

type StarDetail = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  baseRate: number | null;
  externalId: string | null;
  chineseName: string | null;
  createdAt: string;
  updatedAt: string;
  assignmentCount: number;
  submissionCount: number;
  videoCount: number;
  settlementCount: number;
  recentAssignments: Assignment[];
  recentSettlements: Settlement[];
};

const assignmentStatusLabels: Record<string, string> = {
  ACCEPTED: "수락",
  IN_PROGRESS: "진행중",
  SUBMITTED: "제출",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

const settlementStatusLabels: Record<string, string> = {
  PENDING: "대기",
  CONFIRMED: "확인",
  COMPLETED: "완료",
};

export default function AdminStarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editRate, setEditRate] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery<{ data: StarDetail }>({
    queryKey: ["admin-star-detail", id],
    queryFn: () => fetch(`/api/admin/stars/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (newRate: number) =>
      fetch(`/api/admin/stars/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRate: newRate }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error?.message || "수정 실패");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("기본 단가가 수정되었습니다!");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-star-detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
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
        <p className="text-muted-foreground">STAR를 찾을 수 없습니다.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로가기
        </Button>
      </div>
    );
  }

  const star = data.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold">
          {(star.chineseName || star.name).charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {star.chineseName || star.name}
            {star.chineseName && star.name && (
              <span className="text-muted-foreground text-base ml-2">({star.name})</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {star.externalId || "ID 없음"} · 가입일 {new Date(star.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

      {/* Contact & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">이메일</p>
              <p className="text-sm font-medium truncate">{star.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">전화</p>
              <p className="text-sm font-medium">{star.phone || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Film className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">영상</p>
              <p className="text-sm font-medium">{star.videoCount}건</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">제출물</p>
              <p className="text-sm font-medium">{star.submissionCount}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Base Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            기본 단가
          </CardTitle>
          <CardDescription>제출물 1건당 정산 금액</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="baseRate">금액 (원)</Label>
                <Input
                  id="baseRate"
                  type="number"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  placeholder="예: 50000"
                />
              </div>
              <Button
                onClick={() => updateMutation.mutate(Number(editRate))}
                disabled={updateMutation.isPending || !editRate}
              >
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                취소
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold">
                {star.baseRate
                  ? `₩${Number(star.baseRate).toLocaleString()}`
                  : "미설정"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditRate(star.baseRate?.toString() || "");
                  setIsEditing(true);
                }}
              >
                수정
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Assignments */}
      {star.recentAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 프로젝트</CardTitle>
            <CardDescription>{star.assignmentCount}건 총 배정</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {star.recentAssignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{a.request.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(a.request.deadline).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <Badge variant="outline">
                  {assignmentStatusLabels[a.status] || a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Settlements */}
      {star.recentSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 정산</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {star.recentSettlements.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {s.year}년 {s.month}월
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    ₩{Number(s.totalAmount).toLocaleString()}
                  </span>
                  <Badge variant="outline">
                    {settlementStatusLabels[s.status] || s.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

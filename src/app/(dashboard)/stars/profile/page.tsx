"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type UserData = {
  id: string;
  authId: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  baseRate: number | null;
  createdAt: string;
  updatedAt: string;
};

const roleLabels: Record<string, string> = {
  STAR: "크리에이터",
  ADMIN: "관리자",
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(dateStr));
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) throw new Error("프로필을 불러오지 못했습니다.");
      const json = (await res.json()) as { data: UserData };
      return json.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: { name?: string; phone?: string | null }) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "프로필 수정에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("프로필이 수정되었습니다.");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["user-me"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "프로필 수정에 실패했습니다.");
    },
  });

  function startEditing() {
    if (!data) return;
    setName(data.name);
    setPhone(data.phone ?? "");
    setEditing(true);
  }

  function handleSave() {
    updateMutation.mutate({
      name: name.trim() || undefined,
      phone: phone.trim() || null,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
        프로필을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">프로필</h1>
          <p className="text-sm text-muted-foreground">프로필 정보를 확인하고 수정하세요.</p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={startEditing}>
            수정
          </Button>
        )}
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
          <CardDescription>계정에 연결된 기본 프로필 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="profile-name">이름</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">연락처</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  취소
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">{data.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{data.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">연락처</p>
                <p className="font-medium">{data.phone || "미설정"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">역할</p>
                <Badge variant="outline">{roleLabels[data.role] ?? data.role}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {data.baseRate && (
            <div>
              <p className="text-sm text-muted-foreground">기본 단가</p>
              <p className="font-medium">{formatAmount(Number(data.baseRate))}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">가입일</p>
            <p className="font-medium">{formatDate(data.createdAt)}</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

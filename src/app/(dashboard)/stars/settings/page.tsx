"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

type UserData = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
};

export default function SettingsPage() {
  const supabase = createClient();

  // Email change — disabled
  // const [newEmail, setNewEmail] = useState("");
  // const [changingEmail, setChangingEmail] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) throw new Error("설정을 불러오지 못했습니다.");
      const json = (await res.json()) as { data: UserData };
      return json.data;
    },
  });

  // handleEmailChange — 비활성화됨 (Supabase 이메일 확인 문제)
  // 이메일 변경이 필요한 경우 Supabase 대시보드에서 직접 변경해야 합니다.

  async function handlePasswordChange() {
    if (!newPassword.trim()) {
      toast.error("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("비밀번호가 변경되었습니다.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setChangingPassword(false);
    }
  }



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-sm text-muted-foreground">계정 및 보안 설정을 관리하세요.</p>
      </div>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 정보</CardTitle>
          <CardDescription>현재 로그인된 계정 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{data?.email ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">{data?.name ?? "-"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이메일 변경 — 비활성화 */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base">이메일 변경</CardTitle>
          <CardDescription>
            이메일 변경 기능은 현재 사용할 수 없습니다. 이메일 변경이 필요한 경우 관리자에게 문의해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">새 이메일</Label>
            <Input
              id="new-email"
              type="email"
              disabled
              placeholder="관리자 문의 필요"
            />
          </div>
          <Button disabled>
            이메일 변경 (비활성화)
          </Button>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비밀번호 변경</CardTitle>
          <CardDescription>보안을 위해 주기적으로 비밀번호를 변경하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6자 이상"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력"
            />
          </div>
          <Button onClick={handlePasswordChange} disabled={changingPassword}>
            {changingPassword ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </CardContent>
      </Card>

      {/* 위험 구역 */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">위험 구역</CardTitle>
          <CardDescription>계정 삭제는 되돌릴 수 없으며, 모든 데이터가 삭제됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            계정 삭제를 원하시면 관리자에게 문의해 주세요.
          </p>
          <Button variant="destructive" disabled>
            계정 삭제 요청 (관리자 문의)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

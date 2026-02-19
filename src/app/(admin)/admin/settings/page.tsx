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
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserData = {
    id: string;
    email: string;
    name: string;
    phone: string | null;
};

export default function AdminSettingsPage() {
    const supabase = createClient();
    const router = useRouter();

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Email change
    const [newEmail, setNewEmail] = useState("");
    const [changingEmail, setChangingEmail] = useState(false);
    const [isEmailInputReadOnly, setIsEmailInputReadOnly] = useState(true);

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

    async function handleEmailChangeRequest() {
        const trimmed = newEmail.trim();
        if (!trimmed) {
            toast.error("새 이메일을 입력해주세요.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast.error("올바른 이메일 형식을 입력해주세요.");
            return;
        }
        if (trimmed === data?.email) {
            toast.error("현재 사용 중인 이메일과 동일합니다.");
            return;
        }
        setShowConfirmDialog(true);
    }

    async function handleEmailChangeConfirm() {
        setChangingEmail(true);
        try {
            const res = await fetch("/api/users/email-change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: newEmail.trim() }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "이메일 변경 실패");
            }

            toast.success("이메일이 변경되었습니다. 다시 로그인해주세요.", {
                duration: 5000,
            });
            await supabase.auth.signOut();
            router.push("/auth/login");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "이메일 변경 요청에 실패했습니다."
            );
        } finally {
            setChangingEmail(false);
            setShowConfirmDialog(false);
        }
    }

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

            {/* 이메일 변경 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">이메일 변경</CardTitle>
                    <CardDescription>
                        새 이메일 주소를 입력하고 변경하면 <strong>즉시 변경</strong>됩니다. (자동으로 로그아웃됨)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="change-email-input">새 이메일</Label>
                        <Input
                            id="change-email-input"
                            name="change-email-input"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="name@example.com"
                            autoComplete="new-password"
                            disabled={changingEmail}
                            readOnly={isEmailInputReadOnly}
                            onFocus={() => setIsEmailInputReadOnly(false)}
                        />
                    </div>
                    <Button
                        onClick={handleEmailChangeRequest}
                        disabled={changingEmail || !newEmail.trim()}
                    >
                        {changingEmail ? "요청 중..." : "이메일 변경"}
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>이메일 주소를 변경하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이메일을 <span className="font-bold text-foreground">{newEmail}</span>
                            (으)로 변경합니다.
                            <br />
                            변경 후에는 <strong>자동으로 로그아웃</strong>되며, 새 이메일로 다시
                            로그인해야 합니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEmailChangeConfirm}>
                            변경하기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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

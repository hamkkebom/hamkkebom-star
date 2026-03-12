"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ban, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCardWrapper } from "@/components/auth/auth-card-wrapper";

export default function BannedPage() {
  const [bannedReason, setBannedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const user = json.data;
          if (user?.bannedReason) {
            setBannedReason(user.bannedReason);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  return (
    <AuthCardWrapper>
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Ban className="h-10 w-10 text-destructive" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">계정이 영구 정지되었습니다</h2>
          <p className="text-sm text-muted-foreground">
            커뮤니티 가이드라인 위반으로 인해 계정 이용이 제한되었습니다.
          </p>
        </div>

        {/* Reason */}
        {!loading && bannedReason && (
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left">
            <p className="text-xs font-bold text-destructive mb-1">정지 사유</p>
            <p className="text-sm text-foreground">{bannedReason}</p>
          </div>
        )}

        {/* Note */}
        <p className="text-xs text-muted-foreground">
          이의가 있으시면 관리자에게 문의해 주세요.
        </p>

        {/* Back to login */}
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/auth/login">
            <ArrowLeft className="h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </Button>
      </div>
    </AuthCardWrapper>
  );
}

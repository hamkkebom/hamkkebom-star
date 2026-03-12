"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCardWrapper } from "@/components/auth/auth-card-wrapper";

export default function SuspendedPage() {
  const [suspendedReason, setSuspendedReason] = useState<string | null>(null);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const user = json.data;
          if (user?.suspendedReason) {
            setSuspendedReason(user.suspendedReason);
          }
          if (user?.suspendedUntil) {
            const until = new Date(user.suspendedUntil);
            setSuspendedUntil(
              new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(until)
            );
            const diffMs = until.getTime() - Date.now();
            setDaysLeft(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
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
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="h-10 w-10 text-amber-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">계정이 임시 정지되었습니다</h2>
          <p className="text-sm text-muted-foreground">
            커뮤니티 가이드라인 위반으로 인해 일시적으로 이용이 제한되었습니다.
          </p>
        </div>

        {/* Details */}
        {!loading && (suspendedReason || suspendedUntil) && (
          <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left space-y-2">
            {suspendedReason && (
              <>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">정지 사유</p>
                <p className="text-sm text-foreground">{suspendedReason}</p>
              </>
            )}
            {suspendedUntil && (
              <>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-2">해제 예정일</p>
                <p className="text-sm text-foreground">
                  {suspendedUntil}
                  {daysLeft !== null && daysLeft > 0 && (
                    <span className="ml-2 text-muted-foreground">(D-{daysLeft})</span>
                  )}
                </p>
              </>
            )}
          </div>
        )}

        {/* Note */}
        <p className="text-xs text-muted-foreground">
          정지가 해제되면 자동으로 서비스 이용이 가능합니다.
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

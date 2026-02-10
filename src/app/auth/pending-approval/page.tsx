"use client";

import Link from "next/link";
import { Clock, ArrowLeft, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCardWrapper } from "@/components/auth/auth-card-wrapper";

export default function PendingApprovalPage() {
  return (
    <AuthCardWrapper>
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="h-10 w-10 text-amber-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">관리자 승인 대기 중</h2>
          <p className="text-sm text-muted-foreground">
            회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-muted-foreground">
              회원가입이 정상적으로 완료되었습니다
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-muted-foreground">
              관리자가 가입 요청을 확인하고 승인할 예정입니다
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-muted-foreground">
              승인이 완료되면 로그인하여 서비스를 이용할 수 있습니다
            </p>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground">
          승인이 지연되는 경우 관리자에게 문의해 주세요.
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

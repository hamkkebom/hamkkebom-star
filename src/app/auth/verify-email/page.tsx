"use client";

import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCardWrapper } from "@/components/auth/auth-card-wrapper";

export default function VerifyEmailPage() {
  return (
    <AuthCardWrapper>
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
          <Mail className="h-10 w-10 text-violet-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">이메일을 확인해주세요</h2>
          <p className="text-sm text-muted-foreground">
            가입하신 이메일 주소로 인증 링크를 보냈습니다.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
              1
            </div>
            <p className="text-sm text-muted-foreground">
              이메일 수신함을 확인하세요
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">함께봄 스타</strong>에서 보낸
              인증 링크를 클릭하세요
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-muted-foreground">
              인증이 완료되면 자동으로 로그인됩니다
            </p>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground">
          이메일이 보이지 않으면 스팸함을 확인해주세요.
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Star, Film, MessageSquare, DollarSign, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

type MeResponse = {
  user: {
    role: "ADMIN" | "STAR";
  };
};

const features = [
  { icon: Film, title: "영상 제작 관리", desc: "프로젝트 요청부터 완성까지" },
  { icon: MessageSquare, title: "실시간 피드백", desc: "타임코드 기반 정밀 리뷰" },
  { icon: Upload, title: "간편 업로드", desc: "드래그 & 드롭으로 바로 전송" },
  { icon: DollarSign, title: "투명한 정산", desc: "자동 정산 & 실시간 확인" },
];

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const response = await fetch("/api/users/me", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("사용자 정보를 불러오지 못했습니다.");
      }

      const data = (await response.json()) as MeResponse;
      const nextPath = data.user.role === "ADMIN" ? "/admin" : "/stars/dashboard";

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ─── Left: Premium Branding Panel ─── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0a0a1a] p-12 lg:flex">
        {/* Animated Background Orbs */}
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute -left-[15%] top-[10%] h-[500px] w-[500px] animate-[float_8s_ease-in-out_infinite] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute -right-[10%] top-[50%] h-[400px] w-[400px] animate-[float_10s_ease-in-out_infinite_reverse] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute -bottom-[10%] left-[30%] h-[350px] w-[350px] animate-[float_12s_ease-in-out_infinite_1s] rounded-full bg-indigo-500/10 blur-[90px]" />
        </div>

        {/* Subtle Grid Pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content Layer */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">함께봄 스타</span>
          </div>

          {/* Main Content */}
          <div className="space-y-10">
            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-[2.75rem] font-black leading-[1.15] tracking-tight text-white">
                영상 제작의 모든 것을
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  한 곳에서 관리하세요
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-white/50">
                프로젝트 요청부터 피드백, 정산까지 — 함께봄 스타와 함께하는 스마트한 제작 워크플로우.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.06]"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-4 w-4 text-violet-400" />
                  </div>
                  <p className="text-sm font-semibold text-white/90">{f.title}</p>
                  <p className="mt-0.5 text-xs text-white/40">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/25">© 2026 함께봄. All rights reserved.</p>
        </div>

      </div>

      {/* Right: Login form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        {/* Mobile brand */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Star className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">함께봄 스타</span>
        </div>

        <div className="w-full max-w-sm animate-fade-in space-y-6">
          {/* 🔒 AUTH BYPASS: 로그인 없이 바로 대시보드로 이동 */}
          <div className="rounded-lg border-2 border-dashed border-amber-400/50 bg-amber-50/50 p-4 dark:bg-amber-950/20">
            <p className="mb-2 text-center text-xs font-medium text-amber-700 dark:text-amber-400">
              ⚠️ AUTH BYPASS 모드 (개발/테스트용)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/40"
                onClick={() => router.replace("/admin")}
              >
                관리자 대시보드
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/40"
                onClick={() => router.replace("/stars/dashboard")}
              >
                스타 대시보드
              </Button>
            </div>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold">로그인</h2>
            <p className="text-sm text-muted-foreground">
              이메일과 비밀번호를 입력해 주세요.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="비밀번호를 입력하세요"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="h-11 w-full text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                disabled={isSubmitting}
              >
                {isSubmitting ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Form>

          <div className="space-y-2 text-sm">
            <p className="text-right">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                비밀번호 찾기
              </Link>
            </p>
            <p className="text-center text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

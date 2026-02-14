"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Star } from "lucide-react";
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
  data: {
    role: "ADMIN" | "STAR";
    isApproved: boolean;
  };
};



export function LoginForm() {
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

      // Block unapproved users
      if (!data.data.isApproved) {
        await supabase.auth.signOut();
        toast.error("관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.");
        window.location.href = "/auth/pending-approval";
        return;
      }

      // Full page navigation ensures middleware runs and server-side auth works
      window.location.href = "/";
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

        {/* Content Layer — 그라데이션 "별들에게 물어봐" 중앙 표시 */}
        <div className="relative z-10 flex h-full items-center justify-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              별들에게 물어봐
            </h1>
          </Link>
        </div>

      </div>

      {/* Right: Login form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        {/* Mobile brand */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden hover:opacity-80 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Star className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">별들에게 물어봐</span>
        </Link>

        <div className="w-full max-w-sm animate-fade-in space-y-6">
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

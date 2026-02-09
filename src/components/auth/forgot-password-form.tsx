"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

function buildResetRedirectUrl() {
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  const appUrl = rawAppUrl.endsWith("/") ? rawAppUrl.slice(0, -1) : rawAppUrl;
  return `${appUrl}/auth/reset-password`;
}

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: buildResetRedirectUrl(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("비밀번호 재설정 링크를 이메일로 보냈습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">비밀번호 찾기</h2>
        <p className="text-sm text-muted-foreground">
          가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "전송 중..." : "재설정 링크 보내기"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}

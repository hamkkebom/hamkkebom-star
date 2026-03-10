"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

const reportSchema = z.object({
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "COPYRIGHT", "OTHER"], {
    message: "신고 사유를 선택해주세요.",
  }),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.reason === "OTHER" && (!data.description || data.description.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "기타 사유를 입력해주세요.",
      path: ["description"],
    });
  }
});

type ReportInput = z.infer<typeof reportSchema>;

type ReportDialogProps = {
  targetType: "VIDEO" | "COMMENT" | "POST" | "USER";
  targetId: string;
  children: React.ReactNode;
};

const REASONS = [
  { value: "SPAM", label: "스팸" },
  { value: "HARASSMENT", label: "괴롭힘" },
  { value: "INAPPROPRIATE", label: "부적절한 콘텐츠" },
  { value: "COPYRIGHT", label: "저작권 침해" },
  { value: "OTHER", label: "기타" },
];

export function ReportDialog({ targetType, targetId, children }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const form = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: undefined,
      description: "",
    },
  });

  const watchReason = form.watch("reason");

  const onSubmit = async (values: ReportInput) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: values.reason,
          description: values.description,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || "신고 접수에 실패했습니다.");
      }

      toast.success("신고가 접수되었습니다.");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const FormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>신고 사유</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  {REASONS.map((reason) => (
                    <FormItem key={reason.value} className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={reason.value} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        {reason.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchReason === "OTHER" && (
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>상세 내용</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="신고 사유를 상세히 적어주세요."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "제출 중..." : "신고 제출"}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>신고하기</SheetTitle>
          </SheetHeader>
          {FormContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
        </DialogHeader>
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}

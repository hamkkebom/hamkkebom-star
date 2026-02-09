"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRequestSchema, type CreateRequestInput } from "@/lib/validations/project-request";

const requestFormSchema = z.object({
  title: z.string().min(2, "제목은 2자 이상이어야 합니다."),
  categoriesText: z.string().min(1, "카테고리를 1개 이상 입력해주세요."),
  deadline: z.string().min(1, "마감일을 입력해주세요."),
  assignmentType: z.enum(["SINGLE", "MULTIPLE"]),
  maxAssignees: z
    .number()
    .int("담당자 수는 정수여야 합니다.")
    .min(1, "담당자 수는 1명 이상이어야 합니다.")
    .max(10, "담당자 수는 10명 이하여야 합니다."),
  estimatedBudgetText: z.string().optional(),
  requirements: z.string().optional(),
  referenceUrlsText: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

type RequestFormInitialValues = Partial<CreateRequestInput>;

function toDateInputValue(dateInput: string | Date | undefined) {
  if (!dateInput) {
    return "";
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function RequestForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: RequestFormInitialValues;
  submitLabel: string;
  onSubmit: (value: CreateRequestInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      categoriesText: initialValues?.categories?.join(", ") ?? "",
      deadline: toDateInputValue(initialValues?.deadline),
      assignmentType: initialValues?.assignmentType ?? "MULTIPLE",
      maxAssignees: initialValues?.maxAssignees ?? 3,
      estimatedBudgetText:
        initialValues?.estimatedBudget === undefined || initialValues?.estimatedBudget === null
          ? ""
          : String(initialValues.estimatedBudget),
      requirements: initialValues?.requirements ?? "",
      referenceUrlsText: initialValues?.referenceUrls?.join("\n") ?? "",
    },
  });

  const handleSubmit = async (values: RequestFormValues) => {
    setIsSubmitting(true);

    try {
      const parsedPayload = createRequestSchema.safeParse({
        title: values.title,
        categories: values.categoriesText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        deadline: values.deadline,
        assignmentType: values.assignmentType,
        maxAssignees: values.maxAssignees,
        estimatedBudget:
          values.estimatedBudgetText && values.estimatedBudgetText.trim()
            ? Number(values.estimatedBudgetText)
            : undefined,
        requirements: values.requirements,
        referenceUrls: values.referenceUrlsText
          ?.split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });

      if (!parsedPayload.success) {
        toast.error(parsedPayload.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
        return;
      }

      await onSubmit(parsedPayload.data);
      form.reset({
        ...values,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>요청 제목</FormLabel>
              <FormControl>
                <Input placeholder="예: 숏폼 브랜디드 영상 제작" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoriesText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리</FormLabel>
              <FormControl>
                <Input
                  placeholder="예: 숏폼, 브랜딩, 광고"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>마감일</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>할당 방식</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isSubmitting}>
                      <SelectValue placeholder="할당 방식 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MULTIPLE">다중 할당</SelectItem>
                    <SelectItem value="SINGLE">단일 할당</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="maxAssignees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>최대 수락 인원</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    disabled={isSubmitting}
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimatedBudgetText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>예상 예산 (원)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="선택 입력"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>요구사항</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="작업에 필요한 요구사항을 입력해 주세요."
                  rows={5}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referenceUrlsText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>레퍼런스 URL (줄바꿈으로 구분)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="https://example.com/reference-1"
                  rows={4}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "처리 중..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

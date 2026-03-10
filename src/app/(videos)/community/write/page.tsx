"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

type WriteFormValues = {
  boardType: string;
  title: string;
  content: string;
  tags: string;
};

const BOARD_TYPES = [
  { value: "FREE", label: "자유" },
  { value: "QNA", label: "Q&A" },
  { value: "TIPS", label: "제작 팁" },
  { value: "SHOWCASE", label: "작품 자랑" },
  { value: "RECRUITMENT", label: "협업 모집" },
];

export default function WritePostPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.error("로그인이 필요합니다.");
      router.push("/auth/login?callbackUrl=/community/write");
    }
  }, [user, isAuthLoading, router]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<WriteFormValues>({
    defaultValues: {
      boardType: "FREE",
      title: "",
      content: "",
      tags: "",
    }
  });

  const selectedBoardType = watch("boardType");

  const submitMutation = useMutation({
    mutationFn: async (data: WriteFormValues) => {
      const tagsArray = data.tags
        ? data.tags.split(",").map(t => t.trim()).filter(t => t.length > 0)
        : [];
        
      const res = await fetch("/api/board/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          boardType: data.boardType,
          tags: tagsArray,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create post");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("게시글이 등록되었습니다.");
      router.push(`/community/${data.id || data.data?.id || ""}`);
    },
    onError: () => {
      toast.error("게시글 등록에 실패했습니다.");
    }
  });

  const onSubmit = (data: WriteFormValues) => {
    submitMutation.mutate(data);
  };

  if (isAuthLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>;
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3 text-muted-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" /> 취소
        </Button>
        <h1 className="text-xl font-bold">글쓰기</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">게시판 선택</label>
          <div className="flex flex-wrap gap-2">
            {BOARD_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue("boardType", type.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  selectedBoardType === type.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">제목</label>
          <Input
            id="title"
            placeholder="제목을 입력하세요 (최대 100자)"
            {...register("title", { 
              required: "제목을 입력해주세요.",
              maxLength: { value: 100, message: "제목은 100자를 초과할 수 없습니다." }
            })}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium">내용</label>
          <Textarea
            id="content"
            placeholder="내용을 입력하세요 (최소 10자 이상)"
            className={`min-h-[300px] resize-y ${errors.content ? "border-destructive" : ""}`}
            {...register("content", { 
              required: "내용을 입력해주세요.",
              minLength: { value: 10, message: "내용은 최소 10자 이상 입력해주세요." }
            })}
          />
          {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="tags" className="text-sm font-medium">태그 (선택)</label>
          <Input
            id="tags"
            placeholder="태그를 쉼표(,)로 구분하여 입력하세요. 예: 프리미어, 꿀팁"
            {...register("tags")}
          />
        </div>

        <div className="pt-6 border-t border-border flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={submitMutation.isPending} className="min-w-[100px]">
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "등록하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

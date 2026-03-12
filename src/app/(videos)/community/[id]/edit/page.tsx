"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import nextDynamic from "next/dynamic";

const DynamicTiptapEditor = nextDynamic(
  () => import("@/components/community/tiptap-editor").then(mod => ({ default: mod.TiptapEditor })),
  { ssr: false, loading: () => <div className="border border-border rounded-lg bg-card min-h-[300px] animate-pulse" /> }
);

type EditFormValues = {
  boardType: string;
  title: string;
  tags: string;
};

const BOARD_TYPES = [
  { value: "FREE", label: "자유" },
  { value: "QNA", label: "Q&A" },
  { value: "TIPS", label: "제작 팁" },
  { value: "SHOWCASE", label: "작품 자랑" },
  { value: "RECRUITMENT", label: "협업 모집" },
];

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [editorJson, setEditorJson] = useState<object | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [contentError, setContentError] = useState("");
  const [initialContent, setInitialContent] = useState<object | undefined>(undefined);

  // Fetch existing post
  const { data: postData, isLoading: isPostLoading } = useQuery({
    queryKey: ["board-post", postId],
    queryFn: async () => {
      const res = await fetch(`/api/board/posts/${postId}`);
      if (!res.ok) throw new Error("게시글을 불러오는데 실패했습니다.");
      return res.json();
    },
    enabled: !!postId,
  });

  const post = postData?.data;

  // Auth check — only author can edit
  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.error("로그인이 필요합니다.");
      router.push("/auth/login");
    }
    if (post && user && post.author.id !== user.id) {
      toast.error("본인의 게시글만 수정할 수 있습니다.");
      router.push(`/community/${postId}`);
    }
  }, [user, isAuthLoading, post, router, postId]);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<EditFormValues>({
    defaultValues: {
      boardType: "FREE",
      title: "",
      tags: "",
    },
  });

  // Populate form when post loads
  useEffect(() => {
    if (post) {
      reset({
        boardType: post.boardType,
        title: post.title,
        tags: post.tags?.join(", ") || "",
      });
      if (post.contentJson) {
        setInitialContent(post.contentJson as object);
        setEditorJson(post.contentJson as object);
      }
      if (post.content) {
        setEditorHtml(post.content);
      }
    }
  }, [post, reset]);

  const selectedBoardType = watch("boardType");

  const editMutation = useMutation({
    mutationFn: async (data: EditFormValues) => {
      const tagsArray = data.tags
        ? data.tags.split(",").map(t => t.trim()).filter(t => t.length > 0)
        : [];

      const res = await fetch(`/api/board/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: editorHtml,
          contentJson: editorJson,
          boardType: data.boardType,
          tags: tagsArray,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "게시글 수정에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("게시글이 수정되었습니다.");
      router.push(`/community/${postId}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: EditFormValues) => {
    const plainText = editorHtml.replace(/<[^>]*>/g, "").trim();
    if (plainText.length < 10) {
      setContentError("내용은 최소 10자 이상 입력해주세요.");
      return;
    }
    setContentError("");
    editMutation.mutate(data);
  };

  if (isAuthLoading || !user || isPostLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3 text-muted-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" /> 취소
        </Button>
        <h1 className="text-xl font-bold">글 수정</h1>
        <div className="w-16" />
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
                    ? "bg-violet-600 text-foreground border-violet-600"
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
          <label className="text-sm font-medium">내용</label>
          {initialContent ? (
            <DynamicTiptapEditor
              content={initialContent}
              onChange={(json, html) => {
                setEditorJson(json);
                setEditorHtml(html);
                if (contentError) setContentError("");
              }}
              placeholder="내용을 입력하세요 (최소 10자 이상)"
            />
          ) : (
            <div className="border border-border rounded-lg bg-card min-h-[300px] animate-pulse" />
          )}
          {contentError && <p className="text-sm text-destructive">{contentError}</p>}
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
          <Button type="submit" disabled={editMutation.isPending} className="min-w-[100px]">
            {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "수정하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

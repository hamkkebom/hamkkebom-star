"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BOARD_TYPES = [
    { value: "FREE", label: "자유" },
    { value: "QNA", label: "Q&A" },
    { value: "TIPS", label: "제작 팁" },
    { value: "SHOWCASE", label: "작품 자랑" },
    { value: "RECRUITMENT", label: "협업 모집" },
];

export default function CommunityWritePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [boardType, setBoardType] = useState("FREE");
    const [tags, setTags] = useState("");

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/board/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    content,
                    boardType,
                    tags: tags.split(",").map(t => t.trim()).filter(Boolean),
                }),
            });
            if (!res.ok) throw new Error("작성 실패");
            return res.json();
        },
        onSuccess: (data) => {
            toast.success("게시글이 등록되었습니다!");
            router.push(`/community/${data.id}`);
        },
        onError: () => toast.error("게시글 작성에 실패했습니다."),
    });

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
            <PublicHeader />
            <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/community" className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-black text-foreground">글쓰기</h1>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                    {/* 카테고리 */}
                    <div>
                        <label className="text-sm font-bold text-foreground mb-2 block">카테고리</label>
                        <div className="flex flex-wrap gap-2">
                            {BOARD_TYPES.map((bt) => (
                                <button
                                    key={bt.value}
                                    onClick={() => setBoardType(bt.value)}
                                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${boardType === bt.value
                                            ? "bg-violet-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    {bt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="text-sm font-bold text-foreground mb-2 block">제목</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            maxLength={100}
                        />
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="text-sm font-bold text-foreground mb-2 block">내용</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="내용을 입력하세요..."
                            rows={12}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* 태그 */}
                    <div>
                        <label className="text-sm font-bold text-foreground mb-2 block">태그 (쉼표로 구분)</label>
                        <input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="예: 영상편집, 초보, 도움요청"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* 등록 버튼 */}
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={!title.trim() || !content.trim() || mutation.isPending}
                        className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl py-6 text-base shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {mutation.isPending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                        게시글 등록
                    </Button>
                </div>
            </main>
        </div>
    );
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import type { VideoSubject } from "@/generated/prisma/client";
import {
    ArrowLeft, ChevronRight,
    History, Sparkles, Activity, Save, Play,
    Calendar, Clock, CheckCircle2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { toast } from "sonner";
import { VersionTimeline } from "./version-timeline";
import { CinemaContainer } from "./cinema-container";

// --- Types (Matching API response exactly) ---
type SiblingSubmission = {
    id: string;
    version: string;
    status: string;
    createdAt: string;
    versionTitle?: string | null;
    thumbnailUrl?: string | null;
};

type VideoManagerData = {
    id: string;
    versionSlot: number;
    version: string;
    versionTitle: string | null;
    status: string;
    streamUid: string | null;
    summaryFeedback: string | null;
    duration: number | null;
    thumbnailUrl: string | null;
    signedThumbnailUrl: string | null;
    createdAt: string;
    assignment: {
        request: {
            id: string;
            title: string;
            deadline: string;
        };
    } | null;
    video: {
        id: string;
        title: string;
        streamUid: string | null;
        thumbnailUrl: string | null;
        lyrics: string | null;
        categoryId: string | null;
        description: string | null;
        videoSubject: "COUNSELOR" | "BRAND" | "OTHER" | null;
        counselorId: string | null;
        externalId: string | null;
        technicalSpec: { duration: number | null } | null;
    } | null;
    siblings: SiblingSubmission[];
};

async function fetchVideoManagerData(id: string): Promise<VideoManagerData> {
    const res = await fetch(`/api/submissions/${id}?includeSiblings=true`, { cache: "no-store" });
    if (!res.ok) throw new Error("제출물을 불러오지 못했습니다.");
    const json = await res.json();
    return json.data as VideoManagerData;
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

type CategoryItem = {
    id: string;
    name: string;
};

type CounselorItem = {
    id: string;
    displayName: string;
};

export function VideoManagerClient({
    submissionId,
    categories = [],
    counselors = []
}: {
    submissionId: string;
    categories?: CategoryItem[];
    counselors?: CounselorItem[];
}) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [showBumpModal, setShowBumpModal] = useState(false);
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [lyrics, setLyrics] = useState(""); // New Link
    const [categoryId, setCategoryId] = useState(""); // New Link
    const [videoSubject, setVideoSubject] = useState<"COUNSELOR" | "BRAND" | "OTHER">("OTHER");
    const [counselorId, setCounselorId] = useState("");
    const [externalId, setExternalId] = useState("");
    const [dateHover, setDateHover] = useState(false);
    const [thumbFailed, setThumbFailed] = useState(false);
    const hasSynced = useRef(false);

    // Bump Modal States
    const [bumpTitle, setBumpTitle] = useState("");
    const [bumpDesc, setBumpDesc] = useState("");
    const [bumpLyrics, setBumpLyrics] = useState("");
    const [bumpCategoryId, setBumpCategoryId] = useState("");
    const [bumpVideoSubject, setBumpVideoSubject] = useState<"COUNSELOR" | "BRAND" | "OTHER">("OTHER");
    const [bumpCounselorId, setBumpCounselorId] = useState("");

    const { data, isLoading, isError } = useQuery({
        queryKey: ["video-manager", submissionId],
        queryFn: () => fetchVideoManagerData(submissionId),
    });

    // One-time form state initialization from server data
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (data && !hasSynced.current) {
            setTitle(data.versionTitle ?? "");
            setDesc(data.video?.description || data.summaryFeedback || "");
            setLyrics(data.video?.lyrics ?? "");
            setCategoryId(data.video?.categoryId ?? "");
            setVideoSubject(data.video?.videoSubject ?? "OTHER");
            setCounselorId(data.video?.counselorId ?? "");
            setExternalId(data.video?.externalId ?? "");
            hasSynced.current = true;
        }
    }, [data]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Bump Modal State Initialization
    useEffect(() => {
        if (showBumpModal && data) {
            setBumpTitle(data.versionTitle ?? "");
            setBumpDesc(data.video?.description || data.summaryFeedback || "");
            setBumpLyrics(data.video?.lyrics ?? "");
            setBumpCategoryId(data.video?.categoryId ?? "");
            setBumpVideoSubject(data.video?.videoSubject ?? "OTHER");
            setBumpCounselorId(data.video?.counselorId ?? "");
        }
    }, [showBumpModal, data]);

    // Date Formatting (moved before early returns to comply with React hooks rules)
    const { absoluteDate, relativeDate } = useMemo(() => {
        if (!data) return { absoluteDate: "", relativeDate: "" };
        const createdDate = new Date(data.createdAt);
        const abs = createdDate.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        // Use a fixed reference time to avoid impure function calls during render
        const now = new Date();
        const diffMs = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const rel = diffDays === 0 ? "오늘" : diffDays === 1 ? "어제" : `${diffDays}일 전`;
        return { absoluteDate: abs, relativeDate: rel };
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/submissions/${submissionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionTitle: title,
                    summaryFeedback: desc,
                    description: desc, // description 추가
                    lyrics: lyrics,
                    categoryId: categoryId,
                    videoSubject: videoSubject,
                    counselorId: counselorId || null,
                    externalId: externalId || null,
                }),
            });
            if (!res.ok) throw new Error("Update failed");
        },
        onSuccess: () => {
            toast.success("✨ 완벽하게 저장되었습니다!");
            setIsEditing(false);
            hasSynced.current = false;
            queryClient.invalidateQueries({ queryKey: ["video-manager", submissionId] });
        },
        onError: () => toast.error("저장에 실패했습니다."),
    });

    // Version Bump Mutation
    const bumpMutation = useMutation({
        mutationFn: async (streamUid: string) => {
            const res = await fetch(`/api/submissions/${submissionId}/bump`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    streamUid,
                    versionTitle: bumpTitle,
                    summaryFeedback: bumpDesc,
                    lyrics: bumpLyrics,
                    categoryId: bumpCategoryId || null,
                    videoSubject: bumpVideoSubject,
                    counselorId: bumpCounselorId || null,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.message || "버전 업데이트 실패");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message || "새로운 버전이 생성되었습니다! 🚀");
            setShowBumpModal(false);
            // 새 버전으로 이동
            if (data.data?.id) {
                router.push(`/stars/my-videos/${data.data.id}`);
            }
        },
        onError: (err) => toast.error(err.message),
    });

    if (!isLoading && (isError || !data)) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <p>데이터를 불러올 수 없습니다.</p>
                <Button variant="outline" onClick={() => router.push("/stars/my-videos")}>
                    목록으로 돌아가기
                </Button>
            </div>
        );
    }

    // Calculate Next Version (Simple Logic for Display)
    const nextVersion = (() => {
        if (!data) return "?.?";
        const parts = data.version.replace(/^v/, "").split(".").map(Number);
        if (parts.length >= 2) return `${parts[0]}.${parts[1] + 1}`;
        return `${data.version}.1`;
    })();

    // === 데이터 접근 (피드백 페이지와 동일 패턴) ===
    // streamUid: submission 직접 → video 관계 순서로 fallback
    const streamUid = data?.streamUid || data?.video?.streamUid;
    // 썸네일: signedThumbnailUrl → thumbnailUrl 순서
    const thumbnailSrc = data?.signedThumbnailUrl || data?.thumbnailUrl;
    // 프로젝트 제목
    const projectTitle = data?.versionTitle || data?.assignment?.request?.title || data?.video?.title || (data ? `v${data.version}` : "로딩 중...");
    // 재생 시간
    const durationSecs = data?.duration || data?.video?.technicalSpec?.duration;

    const allVersions = data ? [
        {
            id: data.id,
            version: data.version,
            status: data.status,
            createdAt: data.createdAt,
            versionTitle: data.versionTitle,
        },
        ...(data.siblings ?? []),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

    // 현재 보고 있는 버전이 최신인지 확인 (나보다 나중에 생성된 sibling이 없으면 최신)
    const isLatestVersion = data ? !(data.siblings ?? []).some(
        (s) => new Date(s.createdAt).getTime() > new Date(data.createdAt).getTime()
    ) : false;

    return (
        <div className="relative min-h-screen pb-40 bg-background transition-colors duration-500">
            {/* Background Ambient (Adaptive) — 항상 즉시 표시 */}
            <div className="fixed inset-0 -z-20 bg-background transition-colors duration-500" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/15 dark:bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none -z-10" />

            {/* 1. Floating Header — 항상 즉시 표시 */}
            <header className="sticky top-4 z-50 mx-4 sm:mx-6 mb-8">
                <div className="bg-background/80 backdrop-blur-2xl border border-border rounded-full px-4 py-3 flex items-center justify-between shadow-xl transition-all">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full w-10 h-10 hover:bg-muted transition-all hover:scale-105"
                            onClick={() => router.push("/stars/my-videos")}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        {isLoading ? (
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        ) : data ? (
                            <div>
                                <h1 className="font-bold text-sm tracking-wide flex items-center gap-2">
                                    {projectTitle}
                                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                                        v{data.version}
                                    </span>
                                </h1>
                                {data.assignment?.request?.title && data.versionTitle && (
                                    <p className="text-xs text-muted-foreground ml-0.5">{data.assignment.request.title}</p>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Version Bump Button — 데이터 로드 후 최신 버전에서만 노출 */}
                        {!isLoading && data && isLatestVersion && (
                            <Dialog open={showBumpModal} onOpenChange={setShowBumpModal}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 gap-2 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 animate-pulse-subtle">
                                        <Sparkles className="w-4 h-4 text-yellow-300" />
                                        <span>다음 버전 업데이트</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl bg-background/95 backdrop-blur-xl border-white/20 max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                            🚀 다음 버전 제출 및 정보 수정 (v{data.version} → v{nextVersion})
                                        </DialogTitle>
                                        <DialogDescription>
                                            영상 정보를 확인하고 수정한 뒤, 새로운 버전의 영상을 아래에 업로드해주세요.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4 space-y-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Title</label>
                                                <Input value={bumpTitle} onChange={(e) => setBumpTitle(e.target.value)} placeholder="버전 제목을 입력하세요..." />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Description / Intent</label>
                                                <Textarea value={bumpDesc} onChange={(e) => setBumpDesc(e.target.value)} className="min-h-[80px]" placeholder="영상의 제작 의도나 시청 포인트를 기록하세요..." />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Category</label>
                                                    <select value={bumpCategoryId} onChange={(e) => setBumpCategoryId(e.target.value)} className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
                                                        <option value="">카테고리 선택 (선택사항)</option>
                                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Subject</label>
                                                    <select value={bumpVideoSubject} onChange={(e) => setBumpVideoSubject(e.target.value as VideoSubject)} className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
                                                        <option value="COUNSELOR">상담사</option>
                                                        <option value="BRAND">브랜드</option>
                                                        <option value="OTHER">기타</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {bumpVideoSubject === "COUNSELOR" && (
                                                <div className="animate-in fade-in slide-in-from-left-1 mt-2">
                                                    <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Counselor</label>
                                                    <select value={bumpCounselorId} onChange={(e) => setBumpCounselorId(e.target.value)} className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
                                                        <option value="">선택하세요</option>
                                                        {counselors.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Lyrics</label>
                                                <Textarea value={bumpLyrics} onChange={(e) => setBumpLyrics(e.target.value)} className="min-h-[60px]" placeholder="가사를 입력하세요..." />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-border mt-4">
                                            <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1 mb-2 block">Upload Video (마지막 단계)</label>
                                            <UploadDropzone
                                                assignmentId={data.assignment?.request.id || ""}
                                                versionSlot={0}
                                                mode="upload-only"
                                                onUploadSuccess={(uid) => bumpMutation.mutate(uid)}
                                            />
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* History Sheet Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="rounded-full h-10 px-4 gap-2">
                                    <History className="w-4 h-4" />
                                    <span className="hidden sm:inline">버전 히스토리</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[320px] p-0">
                                <SheetHeader className="p-6 border-b border-border">
                                    <SheetTitle className="flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" />
                                        <span>버전 타임라인</span>
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="h-full overflow-y-auto p-4">
                                    <VersionTimeline versions={allVersions} currentVersionId={data?.id ?? ""} />
                                </div>
                            </SheetContent>
                        </Sheet>

                        {data && (
                            <Button asChild className="rounded-full font-bold px-6 h-10">
                                <Link href={`/stars/feedback/${data.id}`}>
                                    피드백 확인하기 <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* 2. Hero Cinema Section */}
            <section className="px-4 sm:px-6 lg:px-12 mb-12">
                <div className="relative w-full max-w-6xl mx-auto group">
                    {/* Dynamic Glow */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 dark:group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />

                    <div className="relative rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-border bg-muted dark:bg-black transform transition-transform duration-700 hover:scale-[1.005]">
                        {isLoading ? (
                            <Skeleton className="aspect-video w-full" />
                        ) : streamUid ? (
                            <CinemaContainer streamUid={streamUid} />
                        ) : (
                            <div className="aspect-video w-full flex flex-col items-center justify-center bg-muted dark:bg-gray-900 text-muted-foreground gap-3">
                                <span className="text-4xl">📺</span>
                                <p className="text-sm font-medium">영상을 불러올 수 없습니다.</p>
                            </div>
                        )}

                        {/* Overlay Info on Hover */}
                        {data && (
                            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="flex items-center justify-between text-white/70 font-mono text-xs tracking-widest">
                                    <span className="bg-black/40 px-2 py-1 rounded backdrop-blur-sm">{data.status}</span>
                                    <span className="bg-black/40 px-2 py-1 rounded backdrop-blur-sm">SEQ: {data.id.substring(0, 8)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 3. Info Section: Metadata + Asset Card */}
            <section className="px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto">
                {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-card/80 backdrop-blur-lg border border-border rounded-3xl p-8 shadow-lg">
                            <Skeleton className="h-8 w-48 mb-4" />
                            <Skeleton className="h-12 w-full mb-4" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                        <div className="lg:col-span-1">
                            <Skeleton className="aspect-video w-full rounded-2xl mb-4" />
                            <Skeleton className="h-40 w-full rounded-3xl" />
                        </div>
                    </div>
                ) : data ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left 2/3: Creator Notes */}
                        <div className="lg:col-span-2 bg-card/80 backdrop-blur-lg border border-border rounded-3xl p-8 shadow-lg relative overflow-hidden transition-colors">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.08] pointer-events-none">
                                <Sparkles className="w-28 h-28 transform rotate-12" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold flex items-center gap-2">📝 크리에이터 노트</h2>
                                        <p className="text-muted-foreground text-sm mt-1">이 버전에 대한 설명을 자유롭게 작성하세요.</p>
                                    </div>
                                    {!isEditing ? (
                                        <Button variant="ghost" onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-primary">수정</Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button variant="ghost" onClick={() => {
                                                setIsEditing(false);
                                                setTitle(data?.versionTitle ?? "");
                                                setDesc(data?.summaryFeedback ?? "");
                                                setLyrics(data?.video?.lyrics ?? "");
                                                setCategoryId(data?.video?.categoryId ?? "");
                                            }} className="text-muted-foreground">취소</Button>
                                            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="gap-2"><Save className="w-4 h-4" /> 저장</Button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Title</label>
                                        {isEditing ? (
                                            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold h-12 px-4" placeholder="버전 제목을 입력하세요..." />
                                        ) : (
                                            <div className="text-lg font-bold px-1">{title || <span className="text-muted-foreground/50 italic">제목 없음</span>}</div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Description / Intent</label>
                                        {isEditing ? (
                                            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[100px] resize-none p-4 leading-relaxed" placeholder="영상의 제작 의도나 시청 포인트를 기록하세요..." />
                                        ) : (
                                            <div className="bg-muted/50 rounded-xl p-5 min-h-[100px] text-foreground/80 leading-relaxed whitespace-pre-wrap border border-border">
                                                {desc || <span className="text-muted-foreground/50 italic">내용 없음</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Category</label>
                                            {isEditing ? (
                                                <div className="space-y-4">
                                                    <select
                                                        value={categoryId}
                                                        onChange={(e) => setCategoryId(e.target.value)}
                                                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                    >
                                                        <option value="">카테고리 선택 (선택사항)</option>
                                                        {categories.map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Subject</label>
                                                            <select
                                                                value={videoSubject}
                                                                onChange={(e) => setVideoSubject(e.target.value as VideoSubject)}
                                                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                            >
                                                                <option value="COUNSELOR">상담사</option>
                                                                <option value="BRAND">브랜드</option>
                                                                <option value="OTHER">기타</option>
                                                            </select>
                                                        </div>
                                                        {videoSubject === "COUNSELOR" && (
                                                            <div className="space-y-2 animate-in fade-in slide-in-from-left-1">
                                                                <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Counselor</label>
                                                                <select
                                                                    value={counselorId}
                                                                    onChange={(e) => setCounselorId(e.target.value)}
                                                                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                                >
                                                                    <option value="">선택하세요</option>
                                                                    {counselors.map((c) => (
                                                                        <option key={c.id} value={c.id}>
                                                                            {c.displayName}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="bg-muted/30 rounded-lg p-3 text-sm text-foreground/80 border border-border">
                                                        {categoryId ? categories.find(c => c.id === categoryId)?.name || "Unknown" : <span className="text-muted-foreground/50 italic">미지정</span>}
                                                    </div>
                                                    {(videoSubject !== "OTHER" || externalId) && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                                {videoSubject === "COUNSELOR" ? "상담사" : videoSubject === "BRAND" ? "브랜드" : "기타"}
                                                            </span>
                                                            {videoSubject === "COUNSELOR" && counselorId && (
                                                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                                    {counselors.find(c => c.id === counselorId)?.displayName || "알 수 없는 상담사"}
                                                                </span>
                                                            )}

                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Lyrics</label>
                                            {isEditing ? (
                                                <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="min-h-[100px] resize-none p-4 leading-relaxed font-mono text-sm" placeholder="가사를 입력하세요..." />
                                            ) : (
                                                <div className="bg-muted/30 rounded-lg p-4 min-h-[60px] text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap border border-border font-mono max-h-[200px] overflow-y-auto">
                                                    {lyrics || <span className="text-muted-foreground/50 italic">가사 없음</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right 1/3: Asset Card */}
                        <div className="lg:col-span-1 space-y-4">
                            {/* Thumbnail Card */}
                            <div className="bg-card/80 backdrop-blur-lg border border-border rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                                {/* Thumbnail */}
                                <div className="w-full aspect-video rounded-2xl bg-muted mb-4 relative overflow-hidden ring-1 ring-border group-hover:ring-primary/40 transition-all duration-500">
                                    {thumbnailSrc && !thumbFailed ? (
                                        <Image
                                            src={thumbnailSrc}
                                            alt={projectTitle}
                                            fill
                                            unoptimized
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            onError={() => setThumbFailed(true)}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-purple-600/10 flex items-center justify-center">
                                            <Play className="w-10 h-10 text-primary/30 group-hover:text-primary group-hover:scale-110 transition-all duration-500" />
                                        </div>
                                    )}

                                    {/* Date Badge */}
                                    <div
                                        className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold shadow-md cursor-help transition-all transform hover:scale-105 select-none"
                                        onMouseEnter={() => setDateHover(true)}
                                        onMouseLeave={() => setDateHover(false)}
                                    >
                                        {dateHover ? relativeDate : absoluteDate}
                                    </div>
                                </div>

                                {/* Asset Identity */}
                                <div className="space-y-3 relative z-10">
                                    <div>
                                        <h3 className="text-base font-bold">영상 정보</h3>
                                        <p className="text-xs text-muted-foreground font-mono mt-1">ID: {data?.id.substring(0, 8).toUpperCase()}</p>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                                            <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> 상태</span>
                                            <span className="font-medium capitalize">{data?.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                                            <span className="text-muted-foreground">버전</span>
                                            <span className="font-medium">v{data?.version}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                                            <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> 등록일</span>
                                            <span className="font-medium">{absoluteDate}</span>
                                        </div>
                                        {durationSecs && (
                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 길이</span>
                                                <span className="font-medium">{formatDuration(durationSecs)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}

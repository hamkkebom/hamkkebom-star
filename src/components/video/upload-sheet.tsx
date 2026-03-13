"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NanoFileUpload } from "@/components/ui/nano-file-upload";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CheckCircle2,
  Tag,
  AlertCircle,
  X,
  ArrowLeft,
} from "lucide-react";
import type { VideoSubject } from "@/generated/prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    requestTitle: string;
    deadline: string;
    categories: string[];
    requirements: string | null;
  };
}

type CategoryItem = {
  id: string;
  name: string;
};

type CounselorItem = {
  id: string;
  displayName: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: "정보 입력" },
  { label: "영상 업로드" },
  { label: "완료" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysLeft(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Step slide animation variants ───────────────────────────────────────────

const stepVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 44 : -44,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -44 : 44,
  }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export function UploadSheet({ open, onOpenChange, assignment }: UploadSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const queryClient = useQueryClient();

  // ── Navigation ──
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  // Prevent accidental close while on upload step (step 1)
  const [isUploading, setIsUploading] = useState(false);

  // ── Form state ──
  const [versionTitle, setVersionTitle] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailResetKey, setThumbnailResetKey] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [videoSubject, setVideoSubject] = useState<VideoSubject>("OTHER");
  const [counselorId, setCounselorId] = useState("");

  // ── Data fetching ──
  const { data: categories } = useQuery<CategoryItem[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60 * 60 * 1000, // 1시간 — 카테고리는 거의 변경되지 않음
  });

  const { data: counselors } = useQuery<CounselorItem[]>({
    queryKey: ["counselors-active"],
    queryFn: async () => {
      const res = await fetch("/api/counselors?status=ACTIVE");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: videoSubject === "COUNSELOR",
    staleTime: 30 * 60 * 1000, // 30분 — 상담사 목록은 드물게 변경됨
  });

  // ── Derived ──
  const daysLeft = getDaysLeft(assignment.deadline);
  const isUrgent = daysLeft <= 3 && daysLeft > 0;
  const isExpired = daysLeft <= 0;
  const canProceed = versionTitle.trim().length > 0 && thumbnailFile !== null;

  // ── Handlers ──
  const goToStep = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
    if (nextStep === 1) setIsUploading(true);
    if (nextStep !== 1) setIsUploading(false);
  };

  const resetForm = () => {
    setStep(0);
    setDirection(1);
    setIsUploading(false);
    setVersionTitle("");
    setThumbnailFile(null);
    setThumbnailResetKey((k) => k + 1);
    setCategoryId("");
    setDescription("");
    setLyrics("");
    setVideoSubject("OTHER");
    setCounselorId("");
  };

  const handleClose = () => {
    if (isUploading) return;
    onOpenChange(false);
    // Delay reset until after close animation
    setTimeout(resetForm, 350);
  };

  const handleComplete = () => {
    setIsUploading(false);
    setStep(2);
    setDirection(1);
    queryClient.invalidateQueries({ queryKey: ["active-projects"] });
  };

  const preventClose = (e: Event) => {
    if (isUploading) e.preventDefault();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile
            ? "rounded-t-2xl max-h-[90dvh] overflow-y-auto"
            : "w-full max-w-[550px] overflow-y-auto"
        )}
        onInteractOutside={preventClose}
        onEscapeKeyDown={preventClose}
      >
        {/* Mobile grab handle */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-black">영상 업로드</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={handleClose}
              disabled={isUploading}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-8 pt-3">
            {STEPS.map(({ label }, idx) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{
                    scale: idx === step ? 1.3 : 1,
                    opacity: idx > step ? 0.3 : 1,
                  }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors duration-300",
                    idx === step
                      ? "bg-violet-500 shadow-[0_0_8px_2px_color-mix(in_oklch,var(--color-violet-500)_40%,transparent)]"
                      : idx < step
                        ? "bg-violet-400 dark:bg-violet-600"
                        : "bg-muted-foreground/20"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold transition-colors duration-300",
                    idx === step
                      ? "text-violet-500"
                      : idx < step
                        ? "text-violet-400/70 dark:text-violet-500/70"
                        : "text-muted-foreground/40"
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* ── Animated Step Content ───────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {/* ── STEP 0: 메타데이터 입력 ──────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="p-6 space-y-5">
                  {/* Project context header */}
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      선택된 프로젝트
                    </p>
                    <p className="font-bold text-base leading-snug line-clamp-2">
                      {assignment.requestTitle}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span
                        className={cn(
                          "font-medium",
                          isExpired
                            ? "text-red-500"
                            : isUrgent
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        )}
                      >
                        {isExpired ? "마감됨" : `D-${daysLeft}`}
                      </span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-muted-foreground">
                        {new Date(assignment.deadline).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {assignment.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assignment.categories.map((cat) => (
                          <span
                            key={cat}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail + version info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-sm">
                        썸네일 이미지 <span className="text-destructive">*</span>
                      </Label>
                      <NanoFileUpload
                        key={thumbnailResetKey}
                        onFileSelect={setThumbnailFile}
                        accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                        label="썸네일 찾기"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-sm">버전 정보</Label>
                      <div className="rounded-xl border bg-card h-[calc(100%-1.75rem)] flex flex-col items-center justify-center gap-1 p-4 text-center min-h-[120px]">
                        <p className="text-xs text-muted-foreground">이번 업로드 버전</p>
                        <span className="text-3xl font-black text-violet-500 drop-shadow-sm">
                          v1.0
                        </span>
                        <p className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                          초기 버전
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Version title (required) */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-sm">
                      영상 제목 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="예: 1차 편집본, 최종 수정 버전"
                      value={versionTitle}
                      onChange={(e) => setVersionTitle(e.target.value)}
                      className="h-11 rounded-xl"
                      maxLength={100}
                    />
                  </div>

                  {/* Category + VideoSubject */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-sm">카테고리</Label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-shadow"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">선택 (선택사항)</option>
                        {categories?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-sm">영상 주제</Label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-shadow"
                        value={videoSubject}
                        onChange={(e) =>
                          setVideoSubject(e.target.value as VideoSubject)
                        }
                      >
                        <option value="COUNSELOR">상담사</option>
                        <option value="BRAND">브랜드</option>
                        <option value="OTHER">기타</option>
                      </select>
                    </div>
                  </div>

                  {/* Counselor select — conditional */}
                  <AnimatePresence>
                    {videoSubject === "COUNSELOR" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <Label className="font-bold text-sm">관련 상담사</Label>
                        <select
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-shadow"
                          value={counselorId}
                          onChange={(e) => setCounselorId(e.target.value)}
                        >
                          <option value="">상담사 선택</option>
                          {counselors?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.displayName}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-sm">설명 (선택사항)</Label>
                    <Textarea
                      placeholder="제작 의도나 설명을 입력해주세요."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[80px] resize-none rounded-xl"
                      maxLength={2000}
                    />
                  </div>

                  {/* Lyrics */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-sm">가사 (선택사항)</Label>
                    <Textarea
                      placeholder="노래 가사가 있다면 입력해주세요."
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      className="min-h-[100px] font-mono text-xs resize-none rounded-xl"
                    />
                  </div>
                </div>

                {/* Step 0 footer */}
                <div className="px-6 pb-8 pt-2 space-y-3">
                  {!canProceed && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      {!versionTitle.trim()
                        ? "영상 제목을 입력해주세요."
                        : "썸네일 이미지를 등록해주세요."}
                    </p>
                  )}
                  <Button
                    className="w-full h-12 rounded-xl font-bold text-base"
                    disabled={!canProceed}
                    onClick={() => goToStep(1)}
                  >
                    다음 — 영상 업로드
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: 영상 업로드 ───────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="p-6 space-y-5">
                  {/* Submission summary */}
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      제출 정보
                    </p>
                    <p className="font-bold text-sm">{versionTitle}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {assignment.requestTitle}
                    </p>
                    {thumbnailFile && (
                      <p className="text-[10px] text-violet-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        썸네일 준비 완료
                      </p>
                    )}
                  </div>

                  {/* UploadDropzone — reused as-is */}
                  <UploadDropzone
                    assignmentId={assignment.id}
                    versionSlot={0}
                    versionTitle={versionTitle}
                    description={description || undefined}
                    lyrics={lyrics || undefined}
                    categoryId={categoryId || undefined}
                    videoSubject={videoSubject}
                    counselorId={counselorId || undefined}
                    thumbnailFile={thumbnailFile}
                    onComplete={handleComplete}
                    mode="submission"
                  />
                </div>

                {/* Step 1 footer */}
                <div className="px-6 pb-8 pt-2">
                  <Button
                    variant="ghost"
                    className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => goToStep(0)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    정보 수정
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: 완료 ─────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col"
              >
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
                  {/* Animated checkmark */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                      delay: 0.1,
                    }}
                    className="relative"
                  >
                    <div className="w-28 h-28 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-11 h-11 text-violet-500" />
                      </div>
                    </div>
                    {/* Pulse glow ring */}
                    <div className="absolute inset-0 rounded-full bg-violet-500/15 blur-2xl animate-pulse" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <h3 className="text-2xl font-black tracking-tight">
                      제출 완료!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      영상이 성공적으로 제출되었습니다 🎉
                    </p>
                    <p className="text-xs text-muted-foreground/70 bg-muted/60 px-3 py-1.5 rounded-full inline-block mt-1">
                      관리자 검토 후 피드백이 전달됩니다
                    </p>
                  </motion.div>
                </div>

                <div className="px-6 pb-8">
                  <Button
                    className="w-full h-12 rounded-xl font-bold"
                    onClick={handleClose}
                  >
                    닫기
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

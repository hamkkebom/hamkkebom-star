"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NanoFileUpload } from "@/components/ui/nano-file-upload";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { cn } from "@/lib/utils";
import {
  Upload,
  Zap,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { VideoSubject } from "@/generated/prisma/client";

type CategoryItem = { id: string; name: string };
type CounselorItem = { id: string; displayName: string };

interface DirectUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_LABELS = ["정보 입력", "영상 업로드", "완료"] as const;

export function DirectUploadSheet({ open, onOpenChange }: DirectUploadSheetProps) {
  const [step, setStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [videoSubject, setVideoSubject] = useState<VideoSubject>("OTHER");
  const [counselorId, setCounselorId] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailResetKey, setThumbnailResetKey] = useState(0);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { data: [] as CategoryItem[] };
      return res.json() as Promise<{ data: CategoryItem[] }>;
    },
    enabled: open,
    staleTime: 3600_000,
  });

  const { data: counselorsData } = useQuery({
    queryKey: ["counselors-active"],
    queryFn: async () => {
      const res = await fetch("/api/counselors?status=ACTIVE");
      if (!res.ok) return { data: [] as CounselorItem[] };
      return res.json() as Promise<{ data: CounselorItem[] }>;
    },
    enabled: open && videoSubject === "COUNSELOR",
  });

  const categories = categoriesData?.data ?? [];
  const counselors = counselorsData?.data ?? [];
  const canProceed = title.trim().length > 0 && thumbnailFile !== null;

  const handleReset = useCallback(() => {
    setStep(0);
    setTitle("");
    setThumbnailFile(null);
    setCategoryId("");
    setVideoSubject("OTHER");
    setCounselorId("");
    setDescription("");
    setIsUploading(false);
    setThumbnailResetKey((k) => k + 1);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (isUploading) return;
    if (!next) handleReset();
    onOpenChange(next);
  };

  const selectClass =
    "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4 space-y-3">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <Upload className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold leading-tight">직접 업로드</SheetTitle>
                <SheetDescription className="text-xs leading-tight mt-0.5">
                  프로젝트·승인 없이 즉시 공개됩니다
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
                    step === i
                      ? "bg-indigo-500 text-white"
                      : step > i
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > i
                    ? <CheckCircle2 className="w-2.5 h-2.5" />
                    : <span>{i + 1}</span>}
                  <span>{label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Step 0: 정보 입력 ── */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Info banner */}
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50">
                  <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">즉시 공개 권한 활성화됨</p>
                    <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 leading-relaxed mt-0.5">
                      업로드 즉시 탐색·검색·메인 페이지에 공개됩니다. 관리자 승인 없이 바로 등록됩니다.
                    </p>
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold">
                    썸네일 <span className="text-destructive">*</span>
                  </Label>
                  <NanoFileUpload
                    key={thumbnailResetKey}
                    onFileSelect={setThumbnailFile}
                    accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                    label="썸네일 이미지 선택 (필수)"
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold">
                    영상 제목 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="시청자가 볼 제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11"
                    maxLength={100}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{title.length}/100</p>
                </div>

                {/* Category + Subject */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">카테고리</Label>
                    <select
                      className={selectClass}
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">선택 안함</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">영상 주제</Label>
                    <select
                      className={selectClass}
                      value={videoSubject}
                      onChange={(e) => {
                        setVideoSubject(e.target.value as VideoSubject);
                        setCounselorId("");
                      }}
                    >
                      <option value="OTHER">기타</option>
                      <option value="COUNSELOR">상담사</option>
                      <option value="BRAND">브랜드</option>
                    </select>
                  </div>
                </div>

                {/* Counselor (conditional) */}
                <AnimatePresence>
                  {videoSubject === "COUNSELOR" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label className="text-sm font-bold">관련 상담사</Label>
                      <select
                        className={selectClass}
                        value={counselorId}
                        onChange={(e) => setCounselorId(e.target.value)}
                      >
                        <option value="">상담사 선택</option>
                        {counselors.map((c) => (
                          <option key={c.id} value={c.id}>{c.displayName}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold">설명 <span className="text-muted-foreground font-normal text-xs">(선택)</span></Label>
                  <Textarea
                    placeholder="영상에 대한 설명을 입력하세요"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none"
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                {/* CTA */}
                <Button
                  className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 gap-2 transition-all"
                  disabled={!canProceed}
                  onClick={() => setStep(1)}
                >
                  다음 — 영상 업로드
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {!canProceed && (
                  <p className="text-center text-[11px] text-muted-foreground -mt-2">
                    {!thumbnailFile ? "썸네일을 먼저 선택해주세요" : "영상 제목을 입력해주세요"}
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Step 1: 영상 업로드 ── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {categoryId && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {categories.find((c) => c.id === categoryId)?.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {videoSubject === "COUNSELOR" ? "상담사" : videoSubject === "BRAND" ? "브랜드" : "기타"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <UploadDropzone
                  versionTitle={title}
                  description={description || undefined}
                  categoryId={categoryId || undefined}
                  videoSubject={videoSubject}
                  counselorId={counselorId || undefined}
                  thumbnailFile={thumbnailFile!}
                  versionSlot={0}
                  directUpload
                  onComplete={() => setStep(2)}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setStep(0)}
                  disabled={isUploading}
                >
                  ← 정보 수정하기
                </Button>
              </motion.div>
            )}

            {/* ── Step 2: 완료 ── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-16 text-center space-y-5"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center"
                >
                  <Sparkles className="w-10 h-10 text-indigo-500" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-1.5"
                >
                  <h3 className="text-xl font-black">업로드 완료!</h3>
                  <p className="text-sm text-muted-foreground">
                    영상이 즉시 공개되었습니다.
                  </p>
                  <p className="text-xs text-indigo-500 font-medium">탐색·검색 페이지에서 바로 확인 가능</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex flex-col gap-2.5 w-full max-w-[260px]"
                >
                  <Button
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-11 rounded-xl shadow-md shadow-indigo-500/20"
                    onClick={handleReset}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    다른 영상 업로드
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => handleOpenChange(false)}
                  >
                    닫기
                  </Button>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

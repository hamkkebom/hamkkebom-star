"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Upload,
  MessageCircleHeart,
  AlertTriangle,
  X,
  Tag,
  Link as LinkIcon,
  Play,
  Lock,
  Clock,
  FileText,
  History,
} from "lucide-react";

// Reuse Assignment type from page
type Submission = {
  id: string;
  version: string;
  versionTitle: string | null;
  status: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type Assignment = {
  id: string;
  status: string;
  createdAt: string;
  request: {
    id: string;
    title: string;
    categories: string[];
    deadline: string;
    estimatedBudget: number | null;
    maxAssignees: number;
    requirements: string | null;
    referenceUrls?: string[];
    status: string; // OPEN, FULL, CLOSED, CANCELLED
    _count: { assignments: number };
  };
  submissions?: Submission[];
};

export interface ProjectDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  onUploadClick: (assignment: Assignment) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACCEPTED: {
    label: "배정됨",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  IN_PROGRESS: {
    label: "작업중",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  SUBMITTED: {
    label: "제출 완료",
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  },
  COMPLETED: {
    label: "승인 완료",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

function getDaysLeft(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectDetailSheet({
  open,
  onOpenChange,
  assignment,
  onUploadClick,
}: ProjectDetailSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!assignment) return null;

  const req = assignment.request;
  const config = statusConfig[assignment.status] ?? {
    label: assignment.status,
    color: "bg-muted text-foreground",
  };
  const daysLeft = getDaysLeft(req.deadline);
  const isUrgent = daysLeft <= 3 && daysLeft > 0;
  const isExpired = daysLeft <= 0;
  const isClosed = req.status === "CLOSED" || req.status === "CANCELLED";
  const isUploadDisabled = isExpired || isClosed || assignment.status === "COMPLETED";
  const canUpload = (assignment.status === "ACCEPTED" || assignment.status === "IN_PROGRESS") && !isUploadDisabled;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile
            ? "rounded-t-2xl max-h-[90dvh] overflow-y-auto"
            : "w-full max-w-[550px] overflow-y-auto",
          (isExpired || isClosed) && "bg-muted/30"
        )}
      >
        {/* Mobile grab handle */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
        )}

        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-black">프로젝트 상세</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Expired/Closed Banner */}
          {(isExpired || isClosed) && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">마감된 프로젝트</p>
                <p className="text-xs opacity-80">더 이상 영상을 업로드할 수 없습니다.</p>
              </div>
            </div>
          )}

          {/* Project Header Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h2 className={cn("text-xl font-black leading-tight", (isExpired || isClosed) && "text-muted-foreground")}>
                {req.title}
              </h2>
              <Badge className={cn("shrink-0 text-xs font-bold", config.color)}>
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className={cn("font-medium", isExpired ? "text-red-500 line-through" : isUrgent ? "text-amber-500" : "")}>
                  {formatDate(req.deadline)}
                </span>
              </div>
              {!isExpired && (
                <Badge variant="outline" className={cn("text-[10px] font-bold", isUrgent && "border-amber-500 text-amber-500")}>
                  D-{daysLeft}
                </Badge>
              )}
            </div>
          </div>

          {/* Project Info Card */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-bold">요구사항 및 정보</h3>
            </div>
            <div className="p-4 space-y-4">
              {req.categories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">카테고리</p>
                  <div className="flex flex-wrap gap-1.5">
                    {req.categories.map((cat) => (
                      <span
                        key={cat}
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-secondary text-muted-foreground"
                      >
                        <Tag className="h-3 w-3" />
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {req.requirements && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">상세 요구사항</p>
                  <div className="text-sm bg-muted/30 p-3 rounded-xl max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {req.requirements}
                  </div>
                </div>
              )}

              {req.referenceUrls && req.referenceUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">참고 링크</p>
                  <div className="space-y-1.5">
                    {req.referenceUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline bg-violet-500/5 p-2 rounded-lg"
                      >
                        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submission History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-bold">제출 내역</h3>
            </div>
            
            {assignment.submissions && assignment.submissions.length > 0 ? (
              <div className="space-y-2">
                {assignment.submissions.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/stars/my-videos/${sub.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-violet-500/30 hover:shadow-sm transition-all">
                      <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                        {sub.thumbnailUrl ? (
                          <Image
                            src={sub.thumbnailUrl}
                            alt="thumbnail"
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-violet-500 transition-colors">
                            {sub.versionTitle ?? `버전 ${sub.version}`}
                          </p>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {sub.version}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatDate(sub.createdAt)}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span
                            className={cn(
                              "font-medium",
                              sub.status === "APPROVED" && "text-emerald-500",
                              sub.status === "REJECTED" && "text-red-500",
                              sub.status === "IN_REVIEW" && "text-blue-500"
                            )}
                          >
                            {sub.status === "PENDING"
                              ? "대기중"
                              : sub.status === "IN_REVIEW"
                                ? "검토중"
                                : sub.status === "APPROVED"
                                  ? "승인됨"
                                  : sub.status === "REJECTED"
                                    ? "반려"
                                    : sub.status === "REVISED"
                                      ? "수정됨"
                                      : sub.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-xl bg-muted/10">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">아직 제출된 영상이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-6 border-t bg-background shrink-0 space-y-3">
          {canUpload ? (
            <Button
              className="w-full h-12 rounded-xl font-bold text-base gap-2"
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => onUploadClick(assignment), 300);
              }}
            >
              <Upload className="h-4 w-4" />
              영상 업로드
            </Button>
          ) : isUploadDisabled ? (
            <Button
              disabled
              variant="secondary"
              className="w-full h-12 rounded-xl font-bold text-base gap-2 opacity-80"
            >
              <Lock className="h-4 w-4" />
              마감됨 — 업로드 불가
            </Button>
          ) : null}

          {assignment.status === "SUBMITTED" && (
            <Link href={`/stars/feedback?assignmentId=${assignment.id}`} className="block">
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl font-bold text-base gap-2"
              >
                <MessageCircleHeart className="h-4 w-4" />
                피드백 확인
              </Button>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

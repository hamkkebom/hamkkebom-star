"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UploadSheet } from "@/components/video/upload-sheet";
import { DirectUploadSheet } from "@/components/video/direct-upload-sheet";
import { ProjectDetailSheet } from "@/components/project/project-detail-sheet";
import {
  Calendar,
  Upload,
  MessageCircleHeart,
  ArrowRight,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- Types ---
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
    status: string;
    _count: { assignments: number };
  };
  submissions?: Submission[];
};

type AssignmentResponse = {
  data: Assignment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// --- Constants ---
const statusConfig: Record<
  string,
  { label: string; color: string }
> = {
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

// --- Data fetching ---
async function fetchActiveProjects(): Promise<AssignmentResponse> {
  const res = await fetch(
    "/api/projects/my-assignments?page=1&pageSize=50&status=ALL",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
  return res.json();
}

function getDaysLeft(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
  return Math.round((deadlineDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

// --- Components ---
function ProjectCard({
  assignment,
  index,
  onUploadClick,
  onClick,
}: {
  assignment: Assignment;
  index: number;
  onUploadClick: (assignment: Assignment) => void;
  onClick: () => void;
}) {
  const req = assignment.request;
  const config = statusConfig[assignment.status] ?? {
    label: assignment.status,
    color: "bg-muted text-foreground",
  };
  const daysLeft = getDaysLeft(req.deadline);
  const isUrgent = daysLeft <= 3 && daysLeft >= 0;
  const isExpired = daysLeft < 0;
  const isCompleted = assignment.status === "COMPLETED";
  const isClosed = req.status === "CLOSED" || req.status === "CANCELLED";
  const isLateUpload = (isExpired || isClosed) && !isCompleted;
  const isUploadDisabled = isCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card transition-all duration-300",
          "hover:shadow-lg hover:border-violet-500/30 dark:hover:shadow-[0_8px_30px_-12px_rgba(124,58,237,0.3)]",
          isUrgent && !isCompleted && "border-amber-500/30",
          isExpired && !isCompleted && "border-amber-500/40 border-dashed",
          isCompleted && "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10"
        )}
      >
        {/* Urgent banner */}
        {isUrgent && !isExpired && !isCompleted && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px] font-bold">
              마감까지 D-{daysLeft} — 서둘러 제출하세요!
            </span>
          </div>
        )}

        {/* Expired banner — 뒤늦은 제출 가능 */}
        {isExpired && !isCompleted && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px] font-bold">
              마감된 프로젝트 · 뒤늦은 제출 가능
            </span>
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-base font-bold text-foreground line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors",
                isExpired && !isCompleted && "text-muted-foreground"
              )}>
                {req.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {isExpired && !isCompleted ? (
                    <span className="text-red-500 font-medium">마감됨</span>
                  ) : (
                    <span
                      className={cn(
                        "font-medium",
                        isUrgent && !isCompleted && "text-amber-500"
                      )}
                    >
                      D-{daysLeft}
                    </span>
                  )}
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className={cn(isExpired && !isCompleted && "line-through opacity-70")}>
                  {formatDate(req.deadline)}
                </span>
              </div>
            </div>
            <Badge className={cn("shrink-0 text-[10px] font-bold", config.color)}>
              {config.label}
            </Badge>
          </div>

          {/* Categories */}
          {req.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {req.categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Submission count — 클릭 시 상세 시트에서 확인 */}
          {assignment.submissions && assignment.submissions.length > 0 ? (
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-200/50 dark:border-violet-800/50 cursor-pointer hover:bg-violet-500/12 transition-colors group/sub"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              <Layers className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex-1">
                제출한 영상 {assignment.submissions.length}개 · 상세에서 확인
              </span>
              <ArrowRight className="h-3 w-3 text-violet-400 group-hover/sub:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div className="mb-4 px-3 py-2 rounded-xl bg-muted/40 border border-dashed border-border/60">
              <span className="text-[11px] text-muted-foreground">아직 제출한 영상이 없습니다</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {(assignment.status === "ACCEPTED" ||
              assignment.status === "IN_PROGRESS") && !isUploadDisabled && !isLateUpload && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-1.5 text-xs font-bold rounded-xl"
                onClick={() => onUploadClick(assignment)}
              >
                <Upload className="h-3.5 w-3.5" />
                영상 업로드
              </Button>
            )}

            {(assignment.status === "ACCEPTED" ||
              assignment.status === "IN_PROGRESS") && isLateUpload && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs font-bold rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={() => onUploadClick(assignment)}
              >
                <Clock className="h-3.5 w-3.5" />
                뒤늦은 제출
              </Button>
            )}

            {assignment.status === "SUBMITTED" && (
              <Link href={`/stars/feedback?assignmentId=${assignment.id}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs font-bold rounded-xl"
                >
                  <MessageCircleHeart className="h-3.5 w-3.5" />
                  피드백 확인
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground"
              onClick={onClick}
            >
              상세
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main Page ---
export default function ActiveProjectsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["active-projects"],
    queryFn: fetchActiveProjects,
  });

  // Upload sheet state
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Detail sheet state
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);

  // Direct upload sheet state
  const [directUploadOpen, setDirectUploadOpen] = useState(false);

  // Check if user has direct upload permission
  const { data: meData } = useQuery({
    queryKey: ["me-direct-upload"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) return null;
      return res.json() as Promise<{ data: { canDirectUpload: boolean } }>;
    },
    staleTime: 60_000,
  });
  const canDirectUpload = meData?.data?.canDirectUpload ?? false;

  const openUploadSheet = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setUploadSheetOpen(true);
  };

  const openDetailSheet = (assignment: Assignment) => {
    setDetailAssignment(assignment);
    setDetailSheetOpen(true);
  };

  // 진행 중 상태만 필터 (COMPLETED 포함)
  const activeAssignments = data?.data.filter((a) =>
    ["ACCEPTED", "IN_PROGRESS", "SUBMITTED", "COMPLETED"].includes(a.status)
  );

  // 상태별 그룹화
  const inProgress = activeAssignments?.filter(
    (a) => a.status === "ACCEPTED" || a.status === "IN_PROGRESS"
  );
  const submitted = activeAssignments?.filter(
    (a) => a.status === "SUBMITTED"
  );
  const completed = activeAssignments?.filter(
    (a) => a.status === "COMPLETED"
  );

  return (
    <div className="min-h-screen space-y-6 pb-20">
      {/* Header */}
      <div className="space-y-2 pt-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-violet-500 dark:text-violet-400 font-bold"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-400/10 text-xs">
            🎬
          </span>
          <span className="text-xs">프로젝트 관리</span>
        </motion.div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">
              진행 중 프로젝트
              <span className="text-violet-500">.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              배정된 프로젝트의 진행 상황을 관리하고 영상을 제출하세요.
            </p>
          </div>
          {canDirectUpload && (
            <button
              onClick={() => setDirectUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all shrink-0"
            >
              <Upload className="w-4 h-4" />
              직접 업로드
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {activeAssignments && activeAssignments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            작업 중 {inProgress?.length ?? 0}건
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            제출 완료 {submitted?.length ?? 0}건
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            승인 완료 {completed?.length ?? 0}건
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-52 rounded-2xl bg-zinc-100 dark:bg-secondary/30"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-red-500/30 bg-red-500/5 rounded-2xl">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold">데이터 로드 실패</h3>
          <p className="text-muted-foreground mt-1">
            네트워크 상태를 확인해주세요.
          </p>
        </div>
      ) : activeAssignments && activeAssignments.length > 0 ? (
        <div className="space-y-8">
          {/* 작업 중 섹션 */}
          {inProgress && inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                작업 중
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {inProgress.map((a, idx) => (
                    <ProjectCard 
                      key={a.id} 
                      assignment={a} 
                      index={idx} 
                      onUploadClick={openUploadSheet} 
                      onClick={() => openDetailSheet(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* 제출 완료 섹션 */}
          {submitted && submitted.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                제출 완료 — 검토 대기
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {submitted.map((a, idx) => (
                    <ProjectCard 
                      key={a.id} 
                      assignment={a} 
                      index={idx} 
                      onUploadClick={openUploadSheet} 
                      onClick={() => openDetailSheet(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* 승인 완료 섹션 */}
          {completed && completed.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                승인 완료
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {completed.map((a, idx) => (
                    <ProjectCard 
                      key={a.id} 
                      assignment={a} 
                      index={idx} 
                      onUploadClick={openUploadSheet} 
                      onClick={() => openDetailSheet(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-500/10 mb-4">
            <Inbox className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-xl font-bold mb-1">진행 중인 프로젝트가 없습니다</h3>
          <p className="text-muted-foreground text-sm mb-4">
            의뢰 게시판에서 프로젝트를 찾아 지원해보세요!
          </p>
          <Link
            href="/stars/project-board"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 dark:text-violet-400 hover:gap-2.5 transition-all"
          >
            의뢰 게시판 바로가기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}

      {/* Direct Upload Sheet */}
      <DirectUploadSheet open={directUploadOpen} onOpenChange={setDirectUploadOpen} />

      {/* Upload Sheet — opens inline without navigating away */}
      {selectedAssignment && (
        <UploadSheet
          open={uploadSheetOpen}
          onOpenChange={setUploadSheetOpen}
          assignment={{
            id: selectedAssignment.id,
            requestTitle: selectedAssignment.request.title,
            deadline: selectedAssignment.request.deadline,
            categories: selectedAssignment.request.categories,
            requirements: selectedAssignment.request.requirements,
          }}
        />
      )}

      {/* Detail Sheet */}
      <ProjectDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        assignment={detailAssignment}
        onUploadClick={openUploadSheet}
      />
    </div>
  );
}

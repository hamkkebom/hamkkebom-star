"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { VideoSubject } from "@/generated/prisma/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { SubmissionList } from "@/components/video/submission-list";
import { NanoFileUpload } from "@/components/ui/nano-file-upload";
import { SpecialProjectCard } from "@/components/video/special-project-card";
import {
  FolderOpen,
  CheckCircle2,
  Clock,
  CalendarDays,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AssignmentItem = {
  id: string;
  requestId?: string;
  requestTitle: string;
  deadline: string;
  status: string;
  requirements: string | null;
  referenceUrls: string[];
  categories: string[];
};

type OpenRequestItem = {
  id: string;
  title: string;
  deadline: string;
  categories: string[];
  requirements: string | null;
  referenceUrls: string[];
  maxAssignees: number;
  currentCount: number;
  status: string; // OPEN, FULL, CLOSED
  myAssignmentStatus: string | null; // ACCEPTED, IN_PROGRESS, COMPLETED... or null
};

const SPECIAL_PROJECT_TITLE = "🐴 2026년 신년 운세 (연애/재회/결혼)";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "ghost", className?: string }> = {
  PENDING_APPROVAL: { label: "승인 대기", variant: "outline", className: "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20" },
  ACCEPTED: { label: "작업중", variant: "default", className: "bg-indigo-500 hover:bg-indigo-600 text-white" },
  IN_PROGRESS: { label: "작업중", variant: "default", className: "bg-indigo-500 hover:bg-indigo-600 text-white" },
  COMPLETED: { label: "완료됨", variant: "secondary", className: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  CANCELLED: { label: "취소됨", variant: "destructive", className: "opacity-70" },
  REJECTED: { label: "거절됨", variant: "destructive", className: "opacity-70" },
  EXPIRED: { label: "마감됨", variant: "outline", className: "text-muted-foreground" },
};

type CategoryItem = {
  id: string;
  name: string;
};

type CounselorItem = {
  id: string;
  displayName: string;
};

export function UploadPageClient({
  assignments,
  openRequests = [],
  categories = [],
  counselors = [],
}: {
  assignments: AssignmentItem[];
  openRequests?: OpenRequestItem[];
  categories?: CategoryItem[];
  counselors?: CounselorItem[];
}) {
  const router = useRouter();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [versionTitle, setVersionTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState(""); // New Link: Lyrics
  const [categoryId, setCategoryId] = useState(""); // New Link: Category
  const [videoSubject, setVideoSubject] = useState<"COUNSELOR" | "BRAND" | "OTHER">("OTHER");
  const [counselorId, setCounselorId] = useState("");
  const [externalId, setExternalId] = useState("");

  const [mainTab, setMainTab] = useState<"my-projects" | "explore">("my-projects");
  const [filterTab, setFilterTab] = useState<"active" | "all">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false); // 모집중인 프로젝트만 보기 필터
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [resetKey, setResetKey] = useState(0); // 썸네일 업로더 초기화 키

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // 초기 카테고리 설정 (프로젝트 요청에 카테고리가 있다면 매칭 시도)
  /* 
  useEffect(() => {
    if (selectedAssignment && selectedAssignment.categories.length > 0) {
       // logic to match name to ID if needed?
       // But request.categories are strings (names). API needs CategoryID.
       // We can match by name.
       const match = categories.find(c => selectedAssignment.categories.includes(c.name));
       if (match) setCategoryId(match.id);
    }
  }, [selectedAssignment, categories]); 
  */
  // 위 로직은 자동 선택 편의성을 위해 추가 가능하지만, 일단 유저가 직접 선택하게 둠.

  // 프로젝트 신청 Mutation
  const applyMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/projects/requests/${requestId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "프로젝트 신청 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("프로젝트 지원이 완료되었습니다!", {
        description: "관리자 승인 후 작업을 시작할 수 있습니다.",
      });
      router.refresh();
      setMainTab("my-projects"); // 내 프로젝트 탭으로 이동
    },
    onError: (error) => {
      toast.error("신청 실패", { description: error.message });
    },
  });

  // 내 프로젝트 이동 핸들러
  const handleGoToMyProject = (reqId: string) => {
    // 해당 request와 연결된 assignment 찾기
    const targetAssignment = assignments.find(a => a.requestId === reqId);
    if (targetAssignment) {
      setSelectedAssignmentId(targetAssignment.id);
      setMainTab("my-projects");
      toast("내 프로젝트로 이동했습니다.", {
        description: "선택된 프로젝트의 작업을 이어서 진행하세요.",
      });
    } else {
      toast.error("해당 프로젝트를 찾을 수 없습니다.");
    }
  };

  // 필터링 및 정렬 로직 (내 프로젝트)
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;

    if (filterTab === "active") {
      filtered = filtered.filter(a => ["PENDING_APPROVAL", "ACCEPTED", "IN_PROGRESS"].includes(a.status));
    }

    if (searchTerm && mainTab === "my-projects") {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.requestTitle.toLowerCase().includes(lower));
    }

    return filtered;
  }, [assignments, filterTab, searchTerm, mainTab]);

  // 필터링 및 정렬 로직 (전체 탐색)
  const filteredOpenRequests = useMemo(() => {
    let filtered = openRequests;

    // 특별 프로젝트는 일반 목록에서 숨기기
    filtered = filtered.filter(r => r.title !== SPECIAL_PROJECT_TITLE);

    // 만약 "모집중만 보기"가 켜져 있으면
    if (showOpenOnly) {
      filtered = filtered.filter(r => r.status === "OPEN");
    }

    if (searchTerm && mainTab === "explore") {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(lower));
    }

    // 마감일 임박순 정렬 (deadline ASC)
    filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    return filtered;
  }, [openRequests, searchTerm, mainTab, showOpenOnly]);

  // 특별 프로젝트 찾기
  const specialProject = openRequests.find(r => r.title === SPECIAL_PROJECT_TITLE);
  const specialAssignment = assignments.find(a => a.requestTitle === SPECIAL_PROJECT_TITLE);

  const handleSpecialProjectClick = () => {
    if (!specialProject) {
      toast.error("진행 중인 특별 이벤트가 없습니다.");
      return;
    }

    if (specialAssignment) {
      handleGoToMyProject(specialProject.id);
    } else {
      // 바로 신청 후 이동
      applyMutation.mutate(specialProject.id);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-2 sm:gap-4 md:flex-row md:items-center md:justify-between px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">프로젝트 찾기 & 제출</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            원하는 프로젝트를 찾아보고 작업한 영상을 제출하세요.
          </p>
        </div>
      </div>

      {/* 🍌 Nano-Banana Pro Workflow Guide */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md animate-fade-in group">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Sparkles className="h-32 w-32 text-indigo-500 rotate-12" />
        </div>
        <div className="absolute -left-10 -bottom-10 h-32 w-32 bg-yellow-100/50 dark:bg-yellow-900/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">

          {/* Title Section */}
          <div className="md:w-1/3 flex flex-col gap-2 text-center md:text-left">
            <div className="inline-flex items-center justify-center md:justify-start gap-2 text-[10px] sm:text-xs font-bold tracking-wider text-indigo-500 uppercase">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Star Workflow Guide
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
              효율적인 <br className="hidden md:block" />
              <span className="text-indigo-600 dark:text-indigo-400">프로젝트 관리</span>의 시작
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
              스타님을 위한 최적화된 워크플로우입니다. <br />
              간단한 3단계로 작업을 시작하고 완료하세요.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="md:w-2/3 w-full grid grid-cols-3 gap-2 sm:gap-4 relative">

            {/* Connecting Line (Desktop) */}
            <div className="hidden sm:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent -translate-y-1/2 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-2 sm:gap-3 group/step">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-indigo-500 group-hover/step:border-indigo-100 transition-all duration-300">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-200">탐색 (Explore)</h4>
                <p className="hidden sm:block text-[10px] sm:text-xs text-zinc-500 mt-1">
                  &apos;프로젝트 찾기&apos; 탭에서<br />새로운 의뢰 확인
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-2 sm:gap-3 group/step">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-indigo-500 group-hover/step:border-indigo-100 transition-all duration-300">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-200">수락 (Accept)</h4>
                <p className="hidden sm:block text-[10px] sm:text-xs text-zinc-500 mt-1">
                  [지원하기] 클릭 시<br />즉시 내 작업으로 이동
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-2 sm:gap-3 group/step">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-indigo-500 group-hover/step:border-indigo-100 transition-all duration-300">
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-200">제출 (Submit)</h4>
                <p className="hidden sm:block text-[10px] sm:text-xs text-zinc-500 mt-1">
                  작업물 업로드 및<br />피드백 관리
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "my-projects" | "explore")} className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b pb-4 px-2 sm:px-0">
          <TabsList className="h-10 w-full sm:w-auto grid grid-cols-2">
            <TabsTrigger value="my-projects" className="gap-1.5 sm:gap-2 px-2 sm:px-6 text-xs sm:text-sm">
              <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              프로젝트 제출
              <Badge className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 h-4 sm:h-5 min-w-[1.25rem] text-[10px] sm:text-xs">
                {assignments.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="explore" className="gap-1.5 sm:gap-2 px-2 sm:px-6 text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              프로젝트 찾기
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 h-4 sm:h-5 min-w-[1.25rem] text-[10px] sm:text-xs">
                {openRequests.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={mainTab === "my-projects" ? "내 프로젝트 검색..." : "새 프로젝트 검색..."}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {mainTab === "my-projects" && (
              <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as "active" | "all")} className="w-auto">
                <TabsList>
                  <TabsTrigger value="active">작업중</TabsTrigger>
                  <TabsTrigger value="all">전체</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {mainTab === "explore" && (
              <div className="flex items-center space-x-2 bg-muted/50 p-1 rounded-lg border">
                <Button
                  variant={!showOpenOnly ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowOpenOnly(false)}
                  className={cn("h-7 text-xs px-3", !showOpenOnly && "bg-background shadow-sm")}
                >
                  전체
                </Button>
                <Button
                  variant={showOpenOnly ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowOpenOnly(true)}
                  className={cn("h-7 text-xs px-3", showOpenOnly && "bg-background shadow-sm text-primary font-bold")}
                >
                  모집중만
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── 내 프로젝트 탭 ─── */}
        <TabsContent value="my-projects" className="space-y-8 mt-0">
          {filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">프로젝트가 없습니다</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mb-6">
                {filterTab === "active"
                  ? "현재 진행 중인 작업이 없습니다. '프로젝트 찾기' 탭에서 새로운 프로젝트를 시작해보세요!"
                  : "배정된 프로젝트 내역이 없습니다."}
              </p>
              <Button onClick={() => setMainTab("explore")} className="gap-2">
                <Sparkles className="h-4 w-4" />
                새 프로젝트 찾아보기
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-2 sm:px-0">
              {filteredAssignments.map((assignment) => {
                const statusInfo = statusMap[assignment.status] || { label: assignment.status, variant: "secondary" };
                const isSelected = selectedAssignmentId === assignment.id;
                const dDay = Math.ceil((new Date(assignment.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = dDay >= 0 && dDay <= 3;

                return (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedAssignmentId(prev => prev === assignment.id ? null : assignment.id)}
                    className={cn(
                      "group relative cursor-pointer rounded-[1rem] sm:rounded-xl border bg-card p-4 sm:p-5 transition-all duration-300 active:scale-[0.98]",
                      isSelected
                        ? "border-primary ring-2 ring-primary/50 shadow-lg scale-[1.02] active:scale-100"
                        : "hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={statusInfo.variant} className={cn("capitalize shadow-sm", statusInfo.className)}>
                        {statusInfo.label}
                      </Badge>
                      {isSelected && (
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary animate-scale-in">
                          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 fill-primary/10" />
                        </div>
                      )}
                    </div>

                    <h3 className={cn("font-bold text-[15px] sm:text-base leading-snug mb-2 line-clamp-2 pr-6", isSelected ? "text-primary" : "text-foreground")}>
                      {assignment.requestTitle}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {assignment.categories.slice(0, 3).map(cat => (
                        <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border/50">
                          {cat}
                        </span>
                      ))}
                      {assignment.categories.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                          +{assignment.categories.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-3 mt-auto">
                      <div className={cn("flex items-center gap-1", isUrgent && "text-destructive font-bold")}>
                        <Clock className="h-3.5 w-3.5" />
                        {dDay < 0 ? "마감됨" : dDay === 0 ? "오늘 마감" : `D-${dDay}`}
                      </div>
                      <div className="flex items-center gap-1 ml-auto font-medium">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(assignment.deadline), "MM.dd", { locale: ko })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── 상세 정보 및 업로드 폼 (내 프로젝트 탭에서만 표시) ─── */}
          <div className={cn(
            "transition-all duration-500 ease-in-out",
            selectedAssignment ? "opacity-100 translate-y-0" : "opacity-50 translate-y-4 pointer-events-none grayscale hidden h-0 overflow-hidden"
          )}>
            <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden mt-8">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center gap-2 text-primary font-semibold mb-1">
                  <CheckCircle2 className="h-5 w-5" />
                  선택된 프로젝트
                </div>
                <CardTitle className="text-xl">
                  {selectedAssignment ? selectedAssignment.requestTitle : "프로젝트를 선택해주세요"}
                </CardTitle>
                <CardDescription>
                  {selectedAssignment?.status === "PENDING_APPROVAL"
                    ? "이 프로젝트는 관리자 승인을 기다리고 있습니다."
                    : "이 프로젝트에 대한 새로운 영상 버전을 업로드합니다."}
                </CardDescription>
              </CardHeader>
              {selectedAssignment && selectedAssignment.status === "PENDING_APPROVAL" ? (
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                      <Clock className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-amber-600">승인 대기 중</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        관리자 승인을 기다리고 있습니다. 승인이 완료되면 영상을 업로드할 수 있습니다.
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                      승인 대기
                    </Badge>
                  </div>
                </CardContent>
              ) : selectedAssignment && (
                <CardContent className="space-y-8 pt-8">
                  {/* 프로젝트 정보 요약 */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 rounded-xl bg-orange-50/50 p-5 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50">
                      <h4 className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        요구사항 체크
                      </h4>
                      <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-200">
                        {selectedAssignment.requirements || "별도 요구사항 없음"}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl bg-blue-50/50 p-5 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                      <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        참고 자료
                      </h4>
                      {selectedAssignment.referenceUrls.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedAssignment.referenceUrls.map((url, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                              <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all dark:text-blue-400">
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">참고 자료 없음</p>
                      )}
                    </div>
                  </div>

                  {/* 입력 폼 */}
                  <div className="grid gap-5 md:grid-cols-12 md:gap-6">
                    <div className="md:col-span-8 space-y-5">
                      <div className="space-y-2">
                        <Label className="text-base font-bold">영상 제목 <span className="text-destructive">*</span></Label>
                        <Input
                          placeholder="예: 1차 편집본, 수정 요청 반영 버전"
                          value={versionTitle}
                          onChange={(e) => setVersionTitle(e.target.value)}
                          className="h-12 text-base sm:text-lg rounded-xl shadow-sm"
                          maxLength={100}
                        />
                      </div>



                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold">카테고리</Label>
                          <select
                            className="flex h-12 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm transition-shadow hover:shadow-md"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                          >
                            <option value="">카테고리 선택 (선택사항)</option>
                            {categories?.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-bold">제작의도 / 설명</Label>
                          <Textarea
                            placeholder="이 영상의 제작 의도를 적어주세요."
                            className="h-12 min-h-[48px] resize-none py-3 rounded-xl shadow-sm"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={2000}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold">가사 (Lyrics)</Label>
                        <Textarea
                          placeholder="노래 가사가 있다면 입력해주세요."
                          value={lyrics}
                          onChange={(e) => setLyrics(e.target.value)}
                          className="min-h-[160px] sm:min-h-[200px] bg-muted/10 font-mono text-xs sm:text-sm leading-relaxed rounded-xl shadow-inner border-border/50"
                        />
                      </div>

                      {/* 추가 메타데이터 (VideoSubject, Counselor, ExternalId) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border/50">
                        <div className="space-y-2">
                          <Label className="font-bold">영상 주제</Label>
                          <select
                            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                            value={videoSubject}
                            onChange={(e) => setVideoSubject(e.target.value as VideoSubject)}
                          >
                            <option value="COUNSELOR">상담사 (Counselor)</option>
                            <option value="BRAND">브랜드 (Brand)</option>
                            <option value="OTHER">기타 (Other)</option>
                          </select>
                        </div>

                        {videoSubject === "COUNSELOR" && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="font-bold">관련 상담사</Label>
                            <select
                              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
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
                          </div>
                        )}


                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-5">
                      {/* 썸네일 업로드 영역 */}
                      <div className="space-y-2">
                        <Label className="font-bold">썸네일 이미지</Label>
                        <div className="transform transition-transform active:scale-[0.98]">
                          <NanoFileUpload
                            key={resetKey}
                            onFileSelect={setThumbnailFile}
                            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                            label="썸네일 찾기"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">버전 정보</Label>
                        <div className="rounded-xl border bg-card p-5 text-center shadow-sm">
                          <p className="text-xs text-muted-foreground mb-1">이번 업로드 버전</p>
                          <span className="text-3xl font-black text-primary drop-shadow-sm">v1.0</span>
                          <p className="text-[10px] text-muted-foreground mt-2 bg-muted/50 inline-block px-2 py-1 rounded-full">
                            이후 버전업은 상세 페이지에서 가능
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 업로드 영역 */}
                  <div className="pt-6 border-t border-border/50">
                    {versionTitle.trim().length > 0 ? (
                      <div className="animate-slide-up bg-card rounded-2xl p-1 shadow-sm border border-border/80">
                        <Label className="mb-4 block text-base font-bold px-2 py-2">파일 업로드 준비완료 🚀</Label>
                        <UploadDropzone
                          assignmentId={selectedAssignment.id}
                          versionSlot={0}
                          versionTitle={versionTitle}
                          description={description || undefined}
                          lyrics={lyrics || undefined}
                          categoryId={categoryId || undefined}
                          videoSubject={videoSubject}
                          counselorId={counselorId || undefined}
                          externalId={externalId || undefined}
                          thumbnailFile={thumbnailFile}
                          onComplete={() => {
                            setVersionTitle("");
                            setDescription("");
                            setThumbnailFile(null);
                            setResetKey(prev => prev + 1); // 썸네일 프리뷰 초기화
                            // versionSlot 고정 (v0.1)
                            setVideoSubject("OTHER");
                            setCounselorId("");
                            setExternalId("");
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 px-4 py-12 text-center transition-all">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                          <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <p className="font-bold text-muted-foreground text-sm sm:text-base">
                          영상의 제목을 먼저 입력해주세요!
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1">
                          제목을 입력하면 파일 업로드 창이 열려요.
                        </p>
                      </div>
                    )}
                  </div>

                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ─── 프로젝트 찾기 탭 ─── */}
        <TabsContent value="explore" className="space-y-6 mt-0">
          {filteredOpenRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-20 text-center animate-fade-in">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">조건에 맞는 프로젝트가 없습니다</h3>
              <p className="text-muted-foreground mt-2">새로운 프로젝트가 올라올 때까지 조금만 기다려주세요!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-2 sm:px-0">
              {filteredOpenRequests.map((req) => {
                const now = new Date();
                const deadlineDate = new Date(req.deadline);
                const diffTime = deadlineDate.getTime() - now.getTime();
                const dDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const isUrgent = dDay >= 0 && dDay <= 3;
                const isClosed = req.status === "CLOSED" || req.status === "FULL" || dDay < 0;
                const isMyProject = !!req.myAssignmentStatus;
                const isPendingApproval = req.myAssignmentStatus === "PENDING_APPROVAL";
                const isRejected = req.myAssignmentStatus === "REJECTED";

                // 모집율 계산
                const progress = Math.min(100, Math.round((req.currentCount / req.maxAssignees) * 100));
                const isFull = req.currentCount >= req.maxAssignees;

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "group relative flex flex-col rounded-[1rem] sm:rounded-2xl border bg-card transition-all duration-300 overflow-hidden",
                      isClosed
                        ? "opacity-60 bg-muted/20 border-border/50 grayscale-[0.5]"
                        : "hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 active:scale-[0.98]",
                      isUrgent && !isClosed && "ring-1 ring-destructive/20 border-destructive/20",
                      isPendingApproval && "ring-1 ring-amber-200 border-amber-200 bg-amber-500/5",
                      isRejected && "opacity-60 grayscale-[0.3]",
                      isMyProject && !isPendingApproval && !isRejected && "ring-2 ring-primary border-primary bg-primary/5"
                    )}
                  >
                    {/* 상단 뱃지 영역 */}
                    <div className="p-4 sm:p-5 pb-3 flex justify-between items-start z-10">
                      <div className="flex gap-2">
                        {isPendingApproval ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 font-bold shadow-sm">
                            <Clock className="w-3 h-3 mr-1" />
                            승인 대기 중
                          </Badge>
                        ) : isRejected ? (
                          <Badge variant="destructive" className="opacity-70 font-bold shadow-sm">
                            거절됨
                          </Badge>
                        ) : isMyProject ? (
                          <Badge className="bg-primary hover:bg-primary font-bold shadow-sm">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            참여중
                          </Badge>
                        ) : (
                          <Badge
                            variant={isClosed ? "secondary" : isUrgent ? "destructive" : "outline"}
                            className={cn(
                              "font-medium shadow-sm",
                              !isClosed && !isUrgent && "text-primary border-primary/30 bg-primary/5",
                              isUrgent && "animate-pulse"
                            )}
                          >
                            {isClosed ? "마감됨" : isUrgent ? "마감임박" : "모집중"}
                          </Badge>
                        )}
                      </div>

                      <div className={cn(
                        "text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md",
                        dDay < 0
                          ? "bg-muted text-muted-foreground"
                          : isUrgent
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                      )}>
                        {dDay < 0 ? "종료" : dDay === 0 ? "오늘마감" : `D-${dDay}`}
                      </div>
                    </div>

                    {/* 컨텐츠 영역 */}
                    <div className="px-4 sm:px-5 space-y-3 mb-4">
                      <h3 className={cn(
                        "font-bold text-[15px] sm:text-lg leading-snug line-clamp-2 transition-colors",
                        !isClosed && "group-hover:text-primary"
                      )}>
                        {req.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5">
                        {req.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium border border-border/50">
                            {cat}
                          </span>
                        ))}
                      </div>

                      {/* 모집 현황 프로그레스 */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                          <span className={cn(isFull && "text-destructive font-bold")}>
                            {isFull ? "정원 마감" : `${req.currentCount}명 참여`}
                          </span>
                          <span className="font-medium">
                            <span className="text-foreground">{req.currentCount}</span>
                            <span className="opacity-50">/{req.maxAssignees}</span>
                          </span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>

                    {/* 하단 액션 영역 */}
                    <div className="mt-auto p-3 sm:p-4 border-t bg-muted/20 flex items-center justify-between gap-3 group-hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">마감일</span>
                        <span className="text-[11px] sm:text-xs font-medium">
                          {format(new Date(req.deadline), "yyyy.MM.dd")}
                        </span>
                      </div>

                      {isPendingApproval ? (
                        <Button size="sm" variant="outline" disabled className="rounded-full h-8 sm:h-9 opacity-70 border-amber-200 text-amber-600 active:scale-95">
                          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                          승인 대기 중
                        </Button>
                      ) : isRejected ? (
                        <Button size="sm" variant="outline" disabled className="rounded-full h-8 sm:h-9 opacity-50 active:scale-95">
                          거절됨
                        </Button>
                      ) : isMyProject ? (
                        <Button
                          size="sm"
                          className="rounded-full px-4 sm:px-5 h-8 sm:h-9 font-bold shadow-sm active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoToMyProject(req.id);
                          }}
                        >
                          작업하기
                          <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1 sm:ml-1.5" />
                        </Button>
                      ) : isClosed ? (
                        <Button size="sm" variant="outline" disabled className="rounded-full h-8 sm:h-9 opacity-50 active:scale-95">
                          신청불가
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className={cn(
                            "rounded-full px-4 sm:px-5 h-8 sm:h-9 font-bold shadow-sm transition-all active:scale-95",
                            isUrgent ? "bg-destructive hover:bg-destructive/90 text-white" : ""
                          )}
                          disabled={applyMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            applyMutation.mutate(req.id);
                          }}
                        >
                          {applyMutation.isPending ? "신청중..." : "지원하기"}
                          {!applyMutation.isPending && <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1 sm:ml-1.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 지난 의뢰 (프로젝트 찾기 탭에서만 보이게) */}
          {specialProject && (
            <div className="mt-8">
              <SpecialProjectCard
                projectTitle={specialProject.title}
                categories={specialProject.categories}
                isAssigned={!!specialAssignment}
                isLoading={applyMutation.isPending}
                onClick={handleSpecialProjectClick}
              />
            </div>
          )}
        </TabsContent>

      </Tabs>

      <div className="mt-20 space-y-4 pt-8 border-t">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">최근 업로드 내역</h2>
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-primary">
            <Link href="/stars/my-videos">전체 보기 →</Link>
          </Button>
        </div>
        <SubmissionList limit={3} />
      </div>
    </div >
  );
}

"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { SubmissionList } from "@/components/video/submission-list";
import {
  ClipboardList,
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
  status: string; // OPEN, FULL, CLOSED
  myAssignmentStatus: string | null; // ACCEPTED, IN_PROGRESS, COMPLETED... or null
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "ghost", className?: string }> = {
  ACCEPTED: { label: "작업중", variant: "default", className: "bg-indigo-500 hover:bg-indigo-600 text-white" },
  IN_PROGRESS: { label: "작업중", variant: "default", className: "bg-indigo-500 hover:bg-indigo-600 text-white" },
  COMPLETED: { label: "완료됨", variant: "secondary", className: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  CANCELLED: { label: "취소됨", variant: "destructive", className: "opacity-70" },
  EXPIRED: { label: "마감됨", variant: "outline", className: "text-muted-foreground" },
};

export function UploadPageClient({
  assignments,
  openRequests = [],
}: {
  assignments: AssignmentItem[];
  openRequests?: OpenRequestItem[];
}) {
  const router = useRouter();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [versionSlot, setVersionSlot] = useState(1);
  const [versionTitle, setVersionTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mainTab, setMainTab] = useState<"my-projects" | "explore">("my-projects");
  const [filterTab, setFilterTab] = useState<"active" | "all">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false); // 모집중인 프로젝트만 보기 필터

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

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
      toast.success("프로젝트 신청이 완료되었습니다!", {
        description: "이제 '내 프로젝트' 탭에서 작업을 시작할 수 있습니다.",
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
      filtered = filtered.filter(a => ["ACCEPTED", "IN_PROGRESS"].includes(a.status));
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

    // 만약 "모집중만 보기"가 켜져 있으면
    if (showOpenOnly) {
      filtered = filtered.filter(r => r.status === "OPEN");
    }

    if (searchTerm && mainTab === "explore") {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(lower));
    }

    return filtered;
  }, [openRequests, searchTerm, mainTab, showOpenOnly]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">영상 업로드</h1>
          <p className="text-muted-foreground mt-1">
            작업 중인 프로젝트를 관리하고 새로운 기회를 찾아보세요.
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
            <div className="inline-flex items-center justify-center md:justify-start gap-2 text-xs font-bold tracking-wider text-indigo-500 uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Star Workflow Guide
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
              효율적인 <br className="hidden md:block" />
              <span className="text-indigo-600 dark:text-indigo-400">프로젝트 관리</span>의 시작
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
              스타님을 위한 최적화된 워크플로우입니다. <br />
              간단한 3단계로 작업을 시작하고 완료하세요.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="md:w-2/3 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 relative">

            {/* Connecting Line (Desktop) */}
            <div className="hidden sm:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent -translate-y-1/2 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-3 group/step">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-indigo-500 group-hover/step:border-indigo-100 transition-all duration-300">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-700 dark:text-zinc-200">탐색 (Explore)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  '프로젝트 찾기' 탭에서<br />새로운 의뢰 확인
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-3 group/step">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-indigo-500 group-hover/step:border-indigo-100 transition-all duration-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-700 dark:text-zinc-200">수락 (Accept)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  [지원하기] 클릭 시<br />즉시 내 작업으로 이동
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center gap-3 group/step">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-indigo-500 group-hover/step:border-indigo-100 transition-all duration-300">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-700 dark:text-zinc-200">제출 (Submit)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  작업물 업로드 및<br />피드백 관리
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "my-projects" | "explore")} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <TabsList className="h-10 w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="my-projects" className="gap-2 px-6">
              <FolderOpen className="h-4 w-4" />
              내 프로젝트
              <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-[1.25rem]">{assignments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="explore" className="gap-2 px-6">
              <Sparkles className="h-4 w-4" />
              프로젝트 찾기
              <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-[1.25rem]">{openRequests.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      "group relative cursor-pointer rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-md",
                      isSelected
                        ? "border-primary ring-1 ring-primary shadow-lg scale-[1.02]"
                        : "hover:border-primary/50 hover:-translate-y-1"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant={statusInfo.variant} className={cn("capitalize shadow-sm", statusInfo.className)}>
                        {statusInfo.label}
                      </Badge>
                      {isSelected && (
                        <div className="absolute top-4 right-4 text-primary animate-scale-in">
                          <CheckCircle2 className="h-6 w-6 fill-primary/10" />
                        </div>
                      )}
                    </div>

                    <h3 className={cn("font-bold leading-tight mb-2 line-clamp-2", isSelected ? "text-primary" : "text-card-foreground")}>
                      {assignment.requestTitle}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {assignment.categories.slice(0, 3).map(cat => (
                        <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {cat}
                        </span>
                      ))}
                      {assignment.categories.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{assignment.categories.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-3 mt-auto">
                      <div className={cn("flex items-center gap-1", isUrgent && "text-destructive font-bold")}>
                        <Clock className="h-3.5 w-3.5" />
                        {dDay < 0 ? "마감됨" : dDay === 0 ? "오늘 마감" : `D-${dDay}`}
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
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
                  이 프로젝트에 대한 새로운 영상 버전을 업로드합니다.
                </CardDescription>
              </CardHeader>

              {selectedAssignment && (
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
                  <div className="grid gap-6 md:grid-cols-12">
                    <div className="md:col-span-8 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-base">영상 제목 <span className="text-destructive">*</span></Label>
                        <Input
                          placeholder="예: 1차 편집본, 수정 요청 반영 버전 등"
                          value={versionTitle}
                          onChange={(e) => setVersionTitle(e.target.value)}
                          className="h-12 text-lg"
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>제작 노트 (선택)</Label>
                        <Textarea
                          placeholder="작업 중 특이사항이나 강조하고 싶은 부분을 남겨주세요."
                          className="min-h-[120px] resize-none"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          maxLength={2000}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-4">
                      <div className="space-y-2">
                        <Label>버전 정보</Label>
                        <div className="rounded-lg border bg-card p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-2">이번 업로드 버전</p>
                          <div className="flex items-center justify-center gap-4">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => setVersionSlot(Math.max(1, versionSlot - 1))}
                              disabled={versionSlot <= 1}
                            >
                              -
                            </Button>
                            <span className="text-2xl font-bold text-primary">v{versionSlot}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => setVersionSlot(Math.min(5, versionSlot + 1))}
                              disabled={versionSlot >= 5}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 업로드 영역 */}
                  <div className="pt-4 border-t">
                    {versionTitle.trim().length > 0 ? (
                      <div className="animate-slide-up">
                        <Label className="mb-3 block text-base">파일 업로드</Label>
                        <UploadDropzone
                          assignmentId={selectedAssignment.id}
                          versionSlot={versionSlot}
                          versionTitle={versionTitle}
                          description={description || undefined}
                          onComplete={() => {
                            setVersionTitle("");
                            setDescription("");
                            setVersionSlot(prev => Math.min(5, prev + 1));
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center transition-colors hover:bg-muted/40">
                        <p className="font-medium text-muted-foreground">
                          제목을 입력하면 업로더가 활성화됩니다
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
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">조건에 맞는 프로젝트가 없습니다</h3>
              <p className="text-muted-foreground mt-2">새로운 프로젝트가 올라올 때까지 조금만 기다려주세요!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOpenRequests.map((req) => {
                const dDay = Math.ceil((new Date(req.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = dDay >= 0 && dDay <= 3;
                const isClosed = req.status === "CLOSED" || req.status === "FULL";
                const isMyProject = !!req.myAssignmentStatus;
                const isCompleted = req.myAssignmentStatus === "COMPLETED";

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "group flex flex-col rounded-xl border bg-card p-5 transition-all duration-300",
                      isClosed ? "opacity-60 bg-muted/30" : "hover:shadow-lg hover:-translate-y-1",
                      isMyProject && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      {isMyProject ? (
                        <Badge className={cn("bg-primary hover:bg-primary", isCompleted ? "bg-green-600" : "")}>
                          {isCompleted ? "완료함" : "참여중"}
                        </Badge>
                      ) : (
                        <Badge variant={isClosed ? "secondary" : "outline"} className={cn(isClosed && "text-muted-foreground")}>
                          {req.status === "FULL" ? "정원마감" : req.status === "CLOSED" ? "종료됨" : "모집중"}
                        </Badge>
                      )}

                      <span className={cn("text-xs font-bold", isUrgent && !isClosed ? "text-destructive" : "text-muted-foreground")}>
                        {dDay < 0 ? "마감됨" : dDay === 0 ? "오늘 마감" : `D-${dDay}`}
                      </span>
                    </div>

                    <h3 className={cn("font-bold text-lg leading-tight mb-2 line-clamp-2 transition-colors", !isClosed && "group-hover:text-primary")}>
                      {req.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {req.categories.slice(0, 3).map(cat => (
                        <Badge key={cat} variant="secondary" className="text-[10px] px-2 py-0.5">
                          {cat}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-auto pt-4 border-t flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        마감: {format(new Date(req.deadline), "yyyy.MM.dd", { locale: ko })}
                      </div>

                      {isMyProject ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-full border-primary/20 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoToMyProject(req.id);
                          }}
                        >
                          작업하러 가기
                          <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      ) : isClosed ? (
                        <Button size="sm" variant="ghost" disabled className="gap-1.5 rounded-full text-muted-foreground cursor-not-allowed">
                          모집 마감
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 rounded-full"
                          disabled={applyMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            applyMutation.mutate(req.id);
                          }}
                        >
                          {applyMutation.isPending ? "신청중..." : "지원하기"}
                          {!applyMutation.isPending && <ArrowRight className="h-3.5 w-3.5 ml-0.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}

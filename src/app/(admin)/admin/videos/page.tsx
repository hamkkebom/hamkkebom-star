"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import {
  Calendar as CalendarIcon,
  Search,
  X,
  Share2,
  Film,
  Pencil,
  Download,
  LayoutGrid,
  LayoutList,
  Layers,
  Play,
  MoreVertical,
  FileVideo,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Upload,
  Highlighter,
  Check,
  EyeOff,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { downloadThumbnail } from "@/lib/download-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { AssignPlacementModal } from "@/components/admin/assign-placement-modal";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Types ───────────────────────────────────────────────────

type SubmissionSummary = {
  id: string;
  version: string;
  versionSlot: number;
  versionTitle: string | null;
  status: string;
  createdAt: string;
  feedbackCount: number;
};

type VideoRow = {
  id: string;
  title: string;
  status: string;
  streamUid: string;
  thumbnailUrl: string | null;
  signedThumbnailUrl: string | null;
  createdAt: string;
  submissionId: string | null;
  latestSubmissionStatus: string | null;
  latestVersion?: string | null;
  submissionCount?: number;
  allSubmissions?: SubmissionSummary[];
  owner: { id: string; name: string; chineseName?: string | null; email: string };
  category: { id: string; name: string; slug: string } | null;
  adEligible: boolean;
  isDirectUpload?: boolean;
};

type EditVideoData = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  videoSubject: string;
};

type VideosResponse = {
  data: VideoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
  submissionStatusCounts?: Record<string, number>;
};

type Category = {
  id: string;
  name: string;
};

// ─── Constants ───────────────────────────────────────────────

// 제출물(Submission) 상태 기반 — 실제 워크플로우: 대기중 / 피드백중 / 승인됨 / 반려됨
type SubmissionStatusKey = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";

const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatusKey, {
  label: string;
  pillClass: string;
  icon: typeof Film;
}> = {
  PENDING: {
    label: "대기중",
    pillClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    icon: Clock,
  },
  IN_REVIEW: {
    label: "피드백중",
    pillClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    icon: FileVideo,
  },
  APPROVED: {
    label: "승인됨",
    pillClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "반려됨",
    pillClass: "bg-red-500/15 text-red-400 border border-red-500/30",
    icon: ShieldCheck,
  },
  REVISED: {
    label: "수정됨",
    pillClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    icon: FileVideo,
  },
};

type VideoStatusKey = "DRAFT" | "PENDING" | "APPROVED" | "FINAL";

const VIDEO_STATUS_CONFIG: Record<VideoStatusKey, {
  label: string;
  pillClass: string;
  icon: typeof Film;
}> = {
  DRAFT: { label: "비공개", pillClass: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30", icon: EyeOff },
  PENDING: { label: "대기중", pillClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30", icon: Clock },
  APPROVED: { label: "공개", pillClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", icon: CheckCircle2 },
  FINAL: { label: "최종", pillClass: "bg-violet-500/15 text-violet-400 border border-violet-500/30", icon: ShieldCheck },
};

// Backward compat for Badge variant (used only in mobile sheet)
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "대기중", variant: "default" },
  IN_REVIEW: { label: "피드백중", variant: "secondary" },
  APPROVED: { label: "승인됨", variant: "outline" },
  REJECTED: { label: "반려됨", variant: "destructive" },
  REVISED: { label: "수정됨", variant: "outline" },
};

const SUBMISSION_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기중" },
  { value: "IN_REVIEW", label: "피드백중" },
  { value: "APPROVED", label: "승인됨" },
  { value: "REJECTED", label: "반려됨" },
];

const VIDEO_SUBJECT_OPTIONS = [
  { value: "COUNSELOR", label: "상담사" },
  { value: "BRAND", label: "브랜드" },
  { value: "OTHER", label: "기타" },
];

const VIEW_STORAGE_KEY = "admin-videos-view";
const GROUP_STORAGE_KEY = "admin-videos-group";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(dateStr));
}

function formatRelativeDate(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return formatDate(dateStr);
}

// ─── Status Pill Component ──────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const config = SUBMISSION_STATUS_CONFIG[status as SubmissionStatusKey];
  if (!config) {
    return <span className="text-xs text-muted-foreground">{status}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", config.pillClass)}>
      <config.icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── KPI Stat Card ──────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  pillClass,
  isLoading: loading,
}: {
  icon: typeof Film;
  label: string;
  value: number;
  pillClass: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
      <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", pillClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-6 w-10 mb-0.5" />
        ) : (
          <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Status Changer Dropdown ────────────────────────────────

function StatusChangerDropdown({
  currentStatus,
  submissionId,
  videoId,
  onSelect,
  onSelectVideo,
  isPending,
  align = "start",
}: {
  currentStatus: string;
  submissionId: string | null;
  videoId: string;
  onSelect: (submissionId: string, status: SubmissionStatusKey) => void;
  onSelectVideo: (videoId: string, status: VideoStatusKey) => void;
  isPending: boolean;
  align?: "start" | "end" | "center";
}) {
  const isVideoMode = !submissionId;

  const statusEntries = isVideoMode
    ? (Object.keys(VIDEO_STATUS_CONFIG) as VideoStatusKey[]).map((s) => ({
        key: s,
        cfg: VIDEO_STATUS_CONFIG[s],
        isCurrent: currentStatus === s,
        onClick: () => onSelectVideo(videoId, s),
      }))
    : (Object.keys(SUBMISSION_STATUS_CONFIG) as SubmissionStatusKey[]).map((s) => ({
        key: s,
        cfg: SUBMISSION_STATUS_CONFIG[s],
        isCurrent: currentStatus === s,
        onClick: () => onSelect(submissionId!, s),
      }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group inline-flex items-center gap-1 rounded-full transition-all",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isPending && "opacity-60 pointer-events-none"
          )}
          disabled={isPending}
        >
          <StatusPill status={currentStatus} />
          <ChevronDown className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-150",
            "group-hover:text-foreground"
          )} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44 p-1.5">
        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          상태 변경
        </div>
        {statusEntries.map(({ key, cfg, isCurrent, onClick }) => (
          <DropdownMenuItem
            key={key}
            disabled={isCurrent}
            onClick={() => !isCurrent && onClick()}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer",
              isCurrent && "opacity-50 cursor-default"
            )}
          >
            <span className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
              cfg.pillClass
            )}>
              <cfg.icon className="w-3 h-3" />
            </span>
            <span className="flex-1">{cfg.label}</span>
            {isCurrent && <Check className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Video Edit Dialog ──────────────────────────────────────

function VideoEditDialog({
  video,
  onClose,
  categories,
}: {
  video: EditVideoData | null;
  onClose: () => void;
  categories: Category[];
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [videoSubject, setVideoSubject] = useState("OTHER");

  useEffect(() => {
    if (video) {
      setTitle(video.title); // eslint-disable-line react-hooks/set-state-in-effect -- sync from prop
      setDescription(video.description);
      setEditCategoryId(video.categoryId);
      setVideoSubject(video.videoSubject);
    }
  }, [video]);

  const mutation = useMutation({
    mutationFn: async (data: { title: string; description: string; categoryId: string | null; videoSubject: string }) => {
      if (!video) throw new Error("영상 정보가 없습니다.");
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "수정에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("영상 정보가 수정되었습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = () => {
    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId: editCategoryId || null,
      videoSubject,
    });
  };

  return (
    <ResponsiveModal
      open={!!video}
      onOpenChange={(open) => !open && onClose()}
      title="영상 정보 수정"
      className="sm:max-w-lg"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">제목</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="영상 제목"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">설명</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="영상 설명"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>카테고리</Label>
          <Select value={editCategoryId} onValueChange={setEditCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">없음</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>영상 주체</Label>
          <Select value={videoSubject} onValueChange={setVideoSubject}>
            <SelectTrigger>
              <SelectValue placeholder="영상 주체 선택" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_SUBJECT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending || !title.trim()}>
          {mutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </ResponsiveModal>
  );
}

// ─── Thumbnail Component ────────────────────────────────────

function VideoThumbnail({
  src,
  alt,
  width,
  height,
  className,
  showPlayOverlay = false,
}: {
  src: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  showPlayOverlay?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted/30 flex-shrink-0", className)}>
      {src ? (
        <Image
          src={src}
          width={width}
          height={height}
          className="object-cover w-full h-full"
          sizes={`${width}px`}
          alt={alt}
          unoptimized
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <Film className="w-6 h-6 text-muted-foreground/40" />
        </div>
      )}
      {showPlayOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors duration-200">
          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200">
            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────

export default function AdminVideosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("latest");
  const [categoryId, setCategoryId] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);
  const [selectedMobileVideo, setSelectedMobileVideo] = useState<VideoRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editVideo, setEditVideo] = useState<EditVideoData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [groupMode, setGroupMode] = useState(false);
  const [expandedVideoIds, setExpandedVideoIds] = useState<Set<string>>(new Set());
  const [directUploadOnly, setDirectUploadOnly] = useState(false);
  const [highlightDirectUpload, setHighlightDirectUpload] = useState(false);

  const pageSize = 50;

  // Restore view & group preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
      const savedGroup = localStorage.getItem(GROUP_STORAGE_KEY);
      if (savedGroup === "true") setGroupMode(true);
    } catch {
      // SSR / localStorage unavailable
    }
  }, []);

  const handleViewChange = useCallback((mode: "list" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const handleGroupChange = useCallback(() => {
    setGroupMode((prev) => {
      const next = !prev;
      try { localStorage.setItem(GROUP_STORAGE_KEY, String(next)); } catch { /* ignore */ }
      setExpandedVideoIds(new Set());
      return next;
    });
  }, []);

  const toggleExpand = useCallback((videoId: string) => {
    setExpandedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId); else next.add(videoId);
      return next;
    });
  }, []);

  // 카테고리 목록 가져오기
  const { data: catData } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { data: [] };
      return (await res.json()) as { data: Category[] };
    },
  });
  const categories = catData?.data ?? [];

  // 영상 목록 가져오기 (필터 적용)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-videos", page, sort, categoryId, ownerName, statusFilter, dateRange, groupMode, directUploadOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort,
      });
      if (categoryId !== "all") params.set("categoryId", categoryId);
      if (ownerName) params.set("ownerName", ownerName);
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString());
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString());
      if (statusFilter !== "ALL") params.set("submissionStatus", statusFilter);
      if (groupMode) params.set("includeVersions", "true");
      if (directUploadOnly) params.set("directUpload", "true");

      const res = await fetch(`/api/videos?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("영상을 불러오지 못했습니다.");
      return (await res.json()) as VideosResponse;
    },
  });

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  // 제출물 상태별 카운트 (API에서 반환)
  const subStatusCounts = data?.submissionStatusCounts ?? {};

  // 실데이터에 존재하는 제출물 상태만 필터 버튼으로 표시
  const dynamicStatusFilters = useMemo(() => {
    const filters: { value: string; label: string }[] = [{ value: "ALL", label: "전체" }];
    for (const sf of SUBMISSION_STATUS_FILTERS) {
      if (sf.value === "ALL") continue;
      if ((subStatusCounts[sf.value] ?? 0) > 0) {
        filters.push(sf);
      }
    }
    return filters;
  }, [subStatusCounts]);

  // 선택된 상태 필터가 더 이상 동적 목록에 없으면 리셋
  useEffect(() => {
    if (statusFilter !== "ALL" && !dynamicStatusFilters.some((sf) => sf.value === statusFilter)) {
      setStatusFilter("ALL");
    }
  }, [dynamicStatusFilters, statusFilter]);

  // Clear selection & expanded state when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedVideoIds(new Set());
  }, [page, sort, categoryId, ownerName, statusFilter, dateRange, directUploadOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerName(searchInput);
    setPage(1);
  };

  // Bulk selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }, [selectedIds.size, rows]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Active filters for chips
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (statusFilter !== "ALL") {
      const cfg = SUBMISSION_STATUS_CONFIG[statusFilter as SubmissionStatusKey];
      chips.push({
        key: "status",
        label: `상태: ${cfg?.label ?? statusFilter}`,
        onClear: () => { setStatusFilter("ALL"); setPage(1); },
      });
    }
    if (categoryId !== "all") {
      const cat = categories.find((c) => c.id === categoryId);
      chips.push({
        key: "category",
        label: `카테고리: ${cat?.name ?? "선택됨"}`,
        onClear: () => { setCategoryId("all"); setPage(1); },
      });
    }
    if (ownerName) {
      chips.push({
        key: "owner",
        label: `작성자: ${ownerName}`,
        onClear: () => { setOwnerName(""); setSearchInput(""); setPage(1); },
      });
    }
    if (dateRange?.from) {
      const label = dateRange.to
        ? `기간: ${format(dateRange.from, "MM.dd", { locale: ko })} - ${format(dateRange.to, "MM.dd", { locale: ko })}`
        : `기간: ${format(dateRange.from, "MM.dd", { locale: ko })}~`;
      chips.push({
        key: "date",
        label,
        onClear: () => { setDateRange(undefined); setPage(1); },
      });
    }
    if (directUploadOnly) {
      chips.push({
        key: "directUpload",
        label: "직접 업로드만",
        onClear: () => { setDirectUploadOnly(false); setPage(1); },
      });
    }
    return chips;
  }, [statusFilter, categoryId, ownerName, dateRange, categories, directUploadOnly]);

  const clearAllFilters = useCallback(() => {
    setStatusFilter("ALL");
    setCategoryId("all");
    setOwnerName("");
    setSearchInput("");
    setDateRange(undefined);
    setDirectUploadOnly(false);
    setPage(1);
  }, []);

  const changeStatusMutation = useMutation({
    mutationFn: async ({ submissionId, status, reason }: { submissionId: string; status: SubmissionStatusKey; reason?: string }) => {
      const res = await fetch(`/api/admin/submissions/${submissionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "상태 변경에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      const label = SUBMISSION_STATUS_CONFIG[vars.status]?.label ?? vars.status;
      toast.success(`상태가 "${label}"으로 변경되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeVideoStatusMutation = useMutation({
    mutationFn: async ({ videoId, status }: { videoId: string; status: VideoStatusKey }) => {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "상태 변경에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      const label = VIDEO_STATUS_CONFIG[vars.status]?.label ?? vars.status;
      toast.success(`영상 상태가 "${label}"으로 변경되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* ─── Page Header ─── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">영상 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            전체 영상 자산을 관리하세요.
          </p>
        </div>

        {/* ─── KPI Stats Row ─── */}
        {(() => {
          const kpiItems: { icon: typeof Film; label: string; value: number; pillClass: string }[] = [
            { icon: Film, label: "전체 영상", value: data?.total ?? 0, pillClass: "bg-primary/15 text-primary" },
          ];
          // 제출물 상태 기준 KPI — 실데이터에 존재하는 상태만 표시
          if ((subStatusCounts.PENDING ?? 0) > 0) {
            kpiItems.push({ icon: Clock, label: "대기중", value: subStatusCounts.PENDING ?? 0, pillClass: "bg-amber-500/15 text-amber-400" });
          }
          if ((subStatusCounts.IN_REVIEW ?? 0) > 0) {
            kpiItems.push({ icon: FileVideo, label: "피드백중", value: subStatusCounts.IN_REVIEW ?? 0, pillClass: "bg-blue-500/15 text-blue-400" });
          }
          if ((subStatusCounts.APPROVED ?? 0) > 0) {
            kpiItems.push({ icon: CheckCircle2, label: "승인됨", value: subStatusCounts.APPROVED ?? 0, pillClass: "bg-emerald-500/15 text-emerald-400" });
          }
          if ((subStatusCounts.REJECTED ?? 0) > 0) {
            kpiItems.push({ icon: ShieldCheck, label: "반려됨", value: subStatusCounts.REJECTED ?? 0, pillClass: "bg-red-500/15 text-red-400" });
          }
          const cols = kpiItems.length <= 2 ? "grid-cols-2" : kpiItems.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4";
          return (
            <div className={`grid ${cols} gap-3`}>
              {kpiItems.map((item) => (
                <KpiCard
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  pillClass={item.pillClass}
                  isLoading={isLoading}
                />
              ))}
            </div>
          );
        })()}

        {/* ─── Filters Card ─── */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col gap-4">
              {/* Row 1: Search + controls */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <form onSubmit={handleSearch} className="flex flex-1 max-w-md gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="작성자 이름 검색..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="icon" className="h-10 w-10 shrink-0">
                    <Search className="w-4 h-4" />
                    <span className="sr-only">검색</span>
                  </Button>
                </form>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* DateRange Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal h-10",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "yyyy. MM. dd", { locale: ko })} -{" "}
                              {format(dateRange.to, "yyyy. MM. dd", { locale: ko })}
                            </>
                          ) : (
                            format(dateRange.from, "yyyy. MM. dd", { locale: ko })
                          )
                        ) : (
                          <span>기간 설정</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range: DateRange | undefined) => {
                          setDateRange(range);
                          setPage(1);
                        }}
                        numberOfMonths={2}
                        locale={ko}
                      />
                      {dateRange && (
                        <div className="p-3 border-t">
                          <Button
                            variant="ghost"
                            className="w-full text-muted-foreground"
                            onClick={() => {
                              setDateRange(undefined);
                              setPage(1);
                            }}
                          >
                            <X className="w-4 h-4 mr-2" /> 초기화
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>

                  <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setPage(1); }}>
                    <SelectTrigger className="w-[140px] h-10">
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 분류</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sort} onValueChange={(val) => { setSort(val); setPage(1); }}>
                    <SelectTrigger className="w-[110px] h-10">
                      <SelectValue placeholder="정렬" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">최신순</SelectItem>
                      <SelectItem value="oldest">오래된순</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Group Toggle */}
                  <Button
                    variant={groupMode ? "default" : "outline"}
                    size="sm"
                    className="h-10 gap-1.5"
                    onClick={handleGroupChange}
                  >
                    <Layers className="w-4 h-4" />
                    <span className="hidden sm:inline">{groupMode ? "버전 펼치기" : "버전 묶기"}</span>
                  </Button>

                  {/* Highlight Direct Upload Toggle */}
                  <Button
                    variant={highlightDirectUpload ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-10 gap-1.5",
                      highlightDirectUpload && "bg-indigo-500 hover:bg-indigo-600 border-indigo-500 text-white"
                    )}
                    onClick={() => setHighlightDirectUpload((prev) => !prev)}
                  >
                    <Highlighter className="w-4 h-4" />
                    <span className="hidden sm:inline">직접 업로드 강조</span>
                  </Button>

                  {/* View Toggle — desktop only */}
                  <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden h-10">
                    <button
                      onClick={() => handleViewChange("list")}
                      className={cn(
                        "flex items-center justify-center w-10 h-full transition-colors",
                        viewMode === "list"
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      aria-label="리스트 보기"
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button
                      onClick={() => handleViewChange("grid")}
                      className={cn(
                        "flex items-center justify-center w-10 h-full transition-colors",
                        viewMode === "grid"
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      aria-label="그리드 보기"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Status pill buttons (실데이터 기준 동적) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {dynamicStatusFilters.map((sf) => (
                  <button
                    key={sf.value}
                    onClick={() => { setStatusFilter(sf.value); setPage(1); }}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150",
                      statusFilter === sf.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {sf.label}
                  </button>
                ))}
                {/* 직접 업로드 필터 */}
                <button
                  onClick={() => { setDirectUploadOnly(prev => !prev); setPage(1); }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150",
                    directUploadOnly
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Upload className="w-3 h-3" />
                  직접 업로드
                </button>
              </div>
            </div>
          </CardHeader>

          {/* ─── Active Filter Chips ─── */}
          <AnimatePresence>
            {activeFilters.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-border/50"
              >
                <div className="flex items-center gap-2 px-5 py-2.5 flex-wrap">
                  {activeFilters.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium pl-2.5 pr-1 py-1"
                    >
                      {chip.label}
                      <button
                        onClick={chip.onClear}
                        className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                  >
                    전체 초기화
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={`vid-sk-${i}`} className="flex items-center gap-4">
                    <Skeleton className="w-20 h-[45px] rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                preset="no-results"
                title="조건에 맞는 영상이 없습니다"
                description="필터를 변경하거나 검색어를 수정해 보세요."
                action={
                  activeFilters.length > 0 ? (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      필터 초기화
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {/* ─── Mobile Video Grid ─── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 md:hidden">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="group relative rounded-2xl overflow-hidden bg-muted/30 border border-border/50 shadow-sm active:scale-95 transition-transform"
                      onClick={() => setSelectedMobileVideo(row)}
                    >
                      <div className="relative aspect-video">
                        {row.signedThumbnailUrl ? (
                          <Image src={row.signedThumbnailUrl} alt={row.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full bg-muted/50">
                            <Film className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                      </div>

                      {/* Badges Floating */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                        <StatusPill status={row.latestSubmissionStatus ?? row.status} />
                        {row.adEligible && (
                          <span className="inline-flex items-center rounded-full bg-primary/80 text-primary-foreground text-[9px] font-bold px-1.5 py-0 shadow-md">
                            AD
                          </span>
                        )}
                        {groupMode && (row.submissionCount ?? 0) > 1 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-black/70 text-white text-[9px] font-bold px-1.5 py-0 shadow-md">
                            <Layers className="w-2.5 h-2.5" /> {row.submissionCount}
                          </span>
                        )}
                        {row.isDirectUpload && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/80 text-white text-[9px] font-bold px-1.5 py-0 shadow-md">
                            <Upload className="w-2.5 h-2.5" />
                            직접
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5 space-y-0.5">
                        <p className="text-xs font-semibold leading-tight line-clamp-2">{row.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{row.owner.chineseName || row.owner.name}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── Desktop: List View ─── */}
                {viewMode === "list" && (
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-4 w-[40px]">
                            <Checkbox
                              checked={rows.length > 0 && selectedIds.size === rows.length}
                              onCheckedChange={toggleSelectAll}
                              aria-label="전체 선택"
                            />
                          </TableHead>
                          <TableHead className="w-[100px]">썸네일</TableHead>
                          <TableHead>제목</TableHead>
                          <TableHead>소유자 (한글 이름)</TableHead>
                          <TableHead>소유자 (닉네임)</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>등록일</TableHead>
                          <TableHead className="text-right pr-4">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const isSelected = selectedIds.has(row.id);
                          const isExpanded = groupMode && expandedVideoIds.has(row.id);
                          return (
                            <Fragment key={row.id}>
                            <TableRow
                              className={cn(
                                "group/row transition-all duration-150 cursor-default",
                                isSelected && "bg-primary/5",
                                isFetching && "opacity-50",
                                "hover:bg-muted/40",
                                isSelected && "border-l-2 border-l-primary",
                                highlightDirectUpload && row.isDirectUpload && "bg-indigo-50/60 dark:bg-indigo-950/25 border-l-2 border-l-indigo-400"
                              )}
                            >
                              <TableCell className="pl-4 w-[40px]">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelect(row.id)}
                                  aria-label={`${row.title} 선택`}
                                />
                              </TableCell>
                              <TableCell className="w-[100px]">
                                <VideoThumbnail
                                  src={row.signedThumbnailUrl}
                                  alt={row.title}
                                  width={80}
                                  height={45}
                                  className="w-20 h-[45px] rounded-lg aspect-video group"
                                  showPlayOverlay
                                />
                              </TableCell>
                              <TableCell className="max-w-[250px]">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium truncate">{row.title}</p>
                                  {groupMode && (row.submissionCount ?? 0) > 1 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                                      className="flex items-center gap-0.5 shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold hover:bg-primary/20 transition-colors"
                                    >
                                      <span>{row.submissionCount}개 버전</span>
                                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", expandedVideoIds.has(row.id) && "rotate-180")} />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{row.owner.chineseName || "-"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{row.owner.name}</TableCell>
                              <TableCell>
                                <span className="text-sm">{row.category?.name ?? "-"}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <StatusChangerDropdown
                                    currentStatus={row.latestSubmissionStatus ?? row.status}
                                    submissionId={row.submissionId}
                                    videoId={row.id}
                                    onSelect={(subId, status) => changeStatusMutation.mutate({ submissionId: subId, status })}
                                    onSelectVideo={(vid, status) => changeVideoStatusMutation.mutate({ videoId: vid, status })}
                                    isPending={changeStatusMutation.isPending || changeVideoStatusMutation.isPending}
                                    align="start"
                                  />
                                  {row.latestSubmissionStatus === "APPROVED" && (
                                    <span className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                      row.adEligible
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    )}>
                                      {row.adEligible ? "광고 가능" : "광고 불가"}
                                    </span>
                                  )}
                                  {row.isDirectUpload && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold">
                                      <Upload className="w-2.5 h-2.5" />
                                      직접 업로드
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                              <TableCell className="text-right pr-4">
                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setEditVideo({
                                          id: row.id,
                                          title: row.title,
                                          description: "",
                                          categoryId: row.category?.id ?? "",
                                          videoSubject: "OTHER",
                                        })}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>정보 수정</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={!row.signedThumbnailUrl && !row.thumbnailUrl}
                                        onClick={() => downloadThumbnail(row.signedThumbnailUrl || row.thumbnailUrl, row.title)}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>썸네일 다운로드</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary hover:text-primary"
                                        onClick={() => {
                                          setSelectedVideo({ id: row.id, title: row.title });
                                          setModalOpen(true);
                                        }}
                                      >
                                        <Share2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>매체 등록</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {row.submissionId ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                          <Link href={`/admin/reviews/${row.submissionId}`}>
                                            <Eye className="h-3.5 w-3.5" />
                                          </Link>
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {row.submissionId ? "상세보기" : "피드백 기록 없음"}
                                    </TooltipContent>
                                  </Tooltip>

                                </div>
                              </TableCell>
                            </TableRow>
                            {/* ─── Version Sub-rows (expanded) ─── */}
                            <AnimatePresence>
                              {isExpanded && row.allSubmissions && row.allSubmissions.length > 0 && (
                                <tr key={`${row.id}-versions`}>
                                  <td colSpan={9} className="p-0 border-0">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="border-l-2 border-l-primary/30 ml-5 bg-muted/20">
                                        {row.allSubmissions.map((sub) => (
                                          <Link
                                            key={sub.id}
                                            href={`/admin/reviews/${sub.id}`}
                                            className="flex items-center gap-4 px-5 py-2.5 hover:bg-muted/40 transition-colors group/sub"
                                          >
                                            <span className="text-xs font-mono font-semibold text-muted-foreground w-12 shrink-0">v{sub.version}</span>
                                            <span className="text-sm truncate flex-1 text-muted-foreground group-hover/sub:text-foreground transition-colors">
                                              {sub.versionTitle || `버전 ${sub.version}`}
                                            </span>
                                            <StatusPill status={sub.status} />
                                            {sub.feedbackCount > 0 && (
                                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MessageSquare className="w-3 h-3" />
                                                {sub.feedbackCount}
                                              </span>
                                            )}
                                            <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(sub.createdAt)}</span>
                                            <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0" />
                                          </Link>
                                        ))}
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* ─── Desktop: Grid View ─── */}
                {viewMode === "grid" && (
                  <div className="hidden md:block p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {rows.map((row) => {
                        const isSelected = selectedIds.has(row.id);
                        return (
                          <div
                            key={row.id}
                            className={cn(
                              "group relative rounded-xl overflow-hidden border bg-card transition-all duration-200",
                              "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 hover:border-border",
                              isSelected ? "border-primary ring-1 ring-primary/30" : "border-border/50"
                            )}
                          >
                            {/* Checkbox overlay */}
                            <div className="absolute top-2 left-2 z-10">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(row.id)}
                                className={cn(
                                  "border-white/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary",
                                  "opacity-0 group-hover:opacity-100 transition-opacity",
                                  isSelected && "opacity-100"
                                )}
                              />
                            </div>

                            {/* Thumbnail */}
                            <div className="relative aspect-video overflow-hidden">
                              {row.signedThumbnailUrl ? (
                                <Image
                                  src={row.signedThumbnailUrl}
                                  alt={row.title}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                />
                              ) : (
                                <div className="flex items-center justify-center w-full h-full bg-muted/50">
                                  <Film className="w-10 h-10 text-muted-foreground/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                              {/* Play overlay */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg scale-75 group-hover:scale-100 transition-transform duration-200">
                                  <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                </div>
                              </div>

                              {/* Status badge — clickable changer */}
                              <div className="absolute top-2 right-2 z-10">
                                <StatusChangerDropdown
                                  currentStatus={row.latestSubmissionStatus ?? row.status}
                                  submissionId={row.submissionId}
                                  videoId={row.id}
                                  onSelect={(subId, status) => changeStatusMutation.mutate({ submissionId: subId, status })}
                                  onSelectVideo={(vid, status) => changeVideoStatusMutation.mutate({ videoId: vid, status })}
                                  isPending={changeStatusMutation.isPending || changeVideoStatusMutation.isPending}
                                  align="end"
                                />
                              </div>

                              {/* Direct upload badge */}
                              {row.isDirectUpload && (
                                <div className="absolute top-2 left-2 z-10">
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 shadow-md">
                                    <Upload className="w-2.5 h-2.5" />
                                    직접
                                  </span>
                                </div>
                              )}

                              {/* Version count badge */}
                              {groupMode && (row.submissionCount ?? 0) > 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleExpand(row.id); }}
                                  className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 hover:bg-black/90 transition-colors"
                                >
                                  <Layers className="w-3 h-3" />
                                  {row.submissionCount}
                                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", expandedVideoIds.has(row.id) && "rotate-180")} />
                                </button>
                              )}

                              {/* 3-dot menu */}
                              <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onClick={() => setEditVideo({
                                        id: row.id,
                                        title: row.title,
                                        description: "",
                                        categoryId: row.category?.id ?? "",
                                        videoSubject: "OTHER",
                                      })}
                                    >
                                      <Pencil className="w-3.5 h-3.5 mr-2" />
                                      정보 수정
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={!row.signedThumbnailUrl && !row.thumbnailUrl}
                                      onClick={() => downloadThumbnail(row.signedThumbnailUrl || row.thumbnailUrl, row.title)}
                                    >
                                      <Download className="w-3.5 h-3.5 mr-2" />
                                      썸네일 다운로드
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedVideo({ id: row.id, title: row.title });
                                        setModalOpen(true);
                                      }}
                                    >
                                      <Share2 className="w-3.5 h-3.5 mr-2" />
                                      매체 등록
                                    </DropdownMenuItem>
                                    {row.submissionId ? (
                                      <DropdownMenuItem asChild>
                                        <Link href={`/admin/reviews/${row.submissionId}`}>
                                          <Eye className="w-3.5 h-3.5 mr-2" />
                                          상세보기
                                        </Link>
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem disabled>
                                        <Eye className="w-3.5 h-3.5 mr-2" />
                                        상세보기
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Card body */}
                            <div className="p-3 space-y-1.5">
                              <p className="text-sm font-semibold line-clamp-2 leading-snug">{row.title}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate">{row.owner.chineseName || row.owner.name}</span>
                                <span className="flex-shrink-0 ml-2">{formatRelativeDate(row.createdAt)}</span>
                              </div>
                              {row.category && (
                                <span className="inline-block text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                  {row.category.name}
                                </span>
                              )}
                            </div>

                            {/* Expanded version panel */}
                            <AnimatePresence>
                              {groupMode && expandedVideoIds.has(row.id) && row.allSubmissions && row.allSubmissions.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-border/50"
                                >
                                  <div className="p-2 space-y-0.5 bg-muted/20">
                                    {row.allSubmissions.map((sub) => (
                                      <Link
                                        key={sub.id}
                                        href={`/admin/reviews/${sub.id}`}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-xs"
                                      >
                                        <span className="font-mono font-semibold text-muted-foreground">v{sub.version}</span>
                                        <StatusPill status={sub.status} />
                                        <span className="text-muted-foreground ml-auto shrink-0">{formatRelativeDate(sub.createdAt)}</span>
                                      </Link>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── Pagination ─── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 pb-5 pt-3 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">
                      총 <span className="font-semibold text-foreground">{data?.total ?? 0}</span>건
                      <span className="mx-1.5 text-border">|</span>
                      {page} / {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isFetching}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {(() => {
                        const maxVisible = 7;
                        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                        let endPage = startPage + maxVisible - 1;
                        if (endPage > totalPages) {
                          endPage = totalPages;
                          startPage = Math.max(1, endPage - maxVisible + 1);
                        }
                        return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                          const pageNum = startPage + i;
                          const isActive = page === pageNum;
                          return (
                            <Button
                              key={pageNum}
                              variant="ghost"
                              size="icon"
                              onClick={() => setPage(pageNum)}
                              className={cn(
                                "w-8 h-8 rounded-full text-xs font-medium",
                                isActive
                                  ? "bg-primary text-primary-foreground pointer-events-none"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              disabled={isFetching}
                            >
                              {pageNum}
                            </Button>
                          );
                        });
                      })()}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || isFetching}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Floating Bulk Action Bar ─── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/30 px-5 py-2.5">
                <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                  {selectedIds.size}건 선택됨
                </span>
                <div className="w-px h-5 bg-border" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const selected = rows.filter((r) => selectedIds.has(r.id));
                        let downloaded = 0;
                        selected.forEach((r) => {
                          if (r.signedThumbnailUrl || r.thumbnailUrl) {
                            downloadThumbnail(r.signedThumbnailUrl || r.thumbnailUrl, r.title);
                            downloaded++;
                          }
                        });
                        if (downloaded === 0) {
                          toast.error("다운로드할 썸네일이 없습니다.");
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>선택 썸네일 다운로드</TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                  onClick={clearSelection}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  선택 해제
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Modals ─── */}
        {selectedVideo && (
          <AssignPlacementModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            videoId={selectedVideo.id}
            videoTitle={selectedVideo.title}
          />
        )}

        <VideoEditDialog
          video={editVideo}
          onClose={() => setEditVideo(null)}
          categories={categories}
        />

        {/* ─── Mobile Video Detail Sheet ─── */}
        <Sheet open={!!selectedMobileVideo} onOpenChange={(open) => !open && setSelectedMobileVideo(null)}>
          <SheetContent side="bottom" className="rounded-t-[32px] p-6 pt-8 max-h-[85vh] bg-background">
            {selectedMobileVideo && (
              <div className="flex flex-col">
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="text-2xl font-black leading-tight pr-8">{selectedMobileVideo.title}</SheetTitle>
                </SheetHeader>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 mb-6 border border-border/50">
                  {selectedMobileVideo.signedThumbnailUrl ? (
                    <Image src={selectedMobileVideo.signedThumbnailUrl} width={72} height={72} className="rounded-xl aspect-square object-cover shadow-sm bg-secondary" alt="" />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                      <Film className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate text-foreground">{selectedMobileVideo.owner.chineseName || selectedMobileVideo.owner.name}</p>
                    <p className="text-sm text-muted-foreground font-medium mb-1.5">{selectedMobileVideo.category?.name ?? "미분류"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={statusMap[selectedMobileVideo.latestSubmissionStatus ?? selectedMobileVideo.status]?.variant ?? "secondary"} className="px-2 border-border/40">
                        {statusMap[selectedMobileVideo.latestSubmissionStatus ?? selectedMobileVideo.status]?.label ?? selectedMobileVideo.latestSubmissionStatus ?? selectedMobileVideo.status}
                      </Badge>
                      {selectedMobileVideo.adEligible && (
                        <Badge className="bg-primary/20 text-primary border-none px-2 shadow-none">광고 가능</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button
                    variant="outline"
                    className="h-14 rounded-2xl text-foreground font-bold border-border/60 hover:bg-muted"
                    onClick={() => {
                      setEditVideo({ id: selectedMobileVideo.id, title: selectedMobileVideo.title, description: "", categoryId: selectedMobileVideo.category?.id ?? "", videoSubject: "OTHER" });
                      setSelectedMobileVideo(null);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> 정보 수정
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 rounded-2xl text-foreground font-bold border-border/60 hover:bg-muted"
                    onClick={() => {
                      setSelectedVideo({ id: selectedMobileVideo.id, title: selectedMobileVideo.title });
                      setModalOpen(true);
                      setSelectedMobileVideo(null);
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2 text-muted-foreground" /> 매체 등록
                  </Button>
                </div>

                {/* Version History (grouped mode) */}
                {groupMode && selectedMobileVideo.allSubmissions && selectedMobileVideo.allSubmissions.length > 0 && (
                  <div className="mb-4 rounded-2xl border border-border/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground">이전 버전 ({selectedMobileVideo.allSubmissions.length})</span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {selectedMobileVideo.allSubmissions.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/admin/reviews/${sub.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                          onClick={() => setSelectedMobileVideo(null)}
                        >
                          <span className="text-xs font-mono font-bold text-muted-foreground">v{sub.version}</span>
                          <span className="text-sm truncate flex-1">{sub.versionTitle || `버전 ${sub.version}`}</span>
                          <StatusPill status={sub.status} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-16 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl active:scale-[0.98] transition-all"
                  disabled={!selectedMobileVideo.submissionId}
                  onClick={() => {
                    if (selectedMobileVideo.submissionId) {
                      window.location.href = `/admin/reviews/${selectedMobileVideo.submissionId}`;
                    }
                  }}
                >
                  {selectedMobileVideo.submissionId ? "상세 피드백 스튜디오 보기" : "피드백 기록 없음"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-14 mt-3 rounded-2xl font-bold bg-muted/50 border-border/60 hover:bg-muted"
                  disabled={!selectedMobileVideo.signedThumbnailUrl && !selectedMobileVideo.thumbnailUrl}
                  onClick={() => downloadThumbnail(selectedMobileVideo.signedThumbnailUrl || selectedMobileVideo.thumbnailUrl, selectedMobileVideo.title)}
                >
                  <Download className="w-5 h-5 mr-2 text-muted-foreground" /> 썸네일 다운로드
                </Button>

                {(() => {
                  const hasSub = !!selectedMobileVideo.submissionId;
                  const currentStatus = selectedMobileVideo.latestSubmissionStatus ?? selectedMobileVideo.status;
                  const entries = hasSub
                    ? (Object.keys(SUBMISSION_STATUS_CONFIG) as SubmissionStatusKey[]).map((s) => ({
                        key: s, cfg: SUBMISSION_STATUS_CONFIG[s],
                        isCurrent: currentStatus === s,
                        onClick: () => { changeStatusMutation.mutate({ submissionId: selectedMobileVideo.submissionId!, status: s }); setSelectedMobileVideo(null); },
                        isPending: changeStatusMutation.isPending,
                      }))
                    : (Object.keys(VIDEO_STATUS_CONFIG) as VideoStatusKey[]).map((s) => ({
                        key: s, cfg: VIDEO_STATUS_CONFIG[s],
                        isCurrent: currentStatus === s,
                        onClick: () => { changeVideoStatusMutation.mutate({ videoId: selectedMobileVideo.id, status: s }); setSelectedMobileVideo(null); },
                        isPending: changeVideoStatusMutation.isPending,
                      }));
                  return (
                    <div className="mt-3 rounded-2xl border border-border/50 overflow-hidden">
                      <div className="px-4 py-2.5 bg-muted/40 border-b border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">상태 변경</span>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {entries.map(({ key, cfg, isCurrent, onClick, isPending }) => (
                          <button
                            key={key}
                            disabled={isCurrent || isPending}
                            onClick={onClick}
                            className={cn(
                              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all border",
                              isCurrent
                                ? cn(cfg.pillClass, "ring-2 ring-offset-1 ring-current opacity-100 cursor-default")
                                : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                            )}
                          >
                            <cfg.icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{cfg.label}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

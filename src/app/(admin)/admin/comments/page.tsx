"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Video,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Heart,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommentType = "all" | "board" | "video";
type HiddenFilter = "all" | "true" | "false";

type UnifiedComment = {
  id: string;
  sourceType: "board" | "video";
  content: string;
  isHidden: boolean;
  isPinned?: boolean;
  likeCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  sourceName: string;
  sourceId: string;
};

type BoardCommentRow = {
  id: string;
  content: string;
  isHidden: boolean;
  likeCount: number;
  createdAt: string;
  postId: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  post: { id: string; title: string; boardType: string } | null;
};

type VideoCommentRow = {
  id: string;
  content: string;
  isHidden: boolean;
  isPinned: boolean;
  likeCount: number;
  createdAt: string;
  videoId: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  video: { id: string; title: string } | null;
};

type BoardCommentsResponse = {
  data: BoardCommentRow[];
  total?: number;
};

type VideoCommentsResponse = {
  data: VideoCommentRow[];
  total?: number;
};

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const SOURCE_TYPE_LABELS: Record<"board" | "video", string> = {
  board: "게시판",
  video: "영상",
};



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

function getSourceIcon(sourceType: "board" | "video") {
  return sourceType === "board" ? FileText : Video;
}

function getSourceBadgeClass(sourceType: "board" | "video"): string {
  return sourceType === "board"
    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
    : "bg-violet-500/15 text-violet-600 dark:text-violet-400";
}

function getHiddenBadgeClass(isHidden: boolean): string {
  return isHidden
    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminCommentsPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("all");
  const [filterHidden, setFilterHidden] = useState<HiddenFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [detailSheet, setDetailSheet] = useState<UnifiedComment | null>(null);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    comment: UnifiedComment | null;
  }>({ open: false, comment: null });

  // Bulk delete confirmation
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  // Bulk action loading
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [singleActionLoading, setSingleActionLoading] = useState(false);

  // Search debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Clear selections on filter/page change
  useEffect(() => {
    setSelectedRows([]);
  }, [commentType, filterHidden, currentPage]);

  // Filter change handler
  const handleCommentTypeChange = useCallback(
    (newType: CommentType) => {
      if (newType === commentType) return;
      setCommentType(newType);
      setCurrentPage(1);
    },
    [commentType],
  );

  // ---------------------------------------------------------------------------
  // Data fetching — TWO parallel queries
  // ---------------------------------------------------------------------------

  const boardQuery = useQuery({
    queryKey: [
      "admin-board-comments",
      { isHidden: filterHidden, search: debouncedSearch },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (filterHidden !== "all") params.set("isHidden", filterHidden);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(
        `/api/admin/board-comments?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("게시판 댓글을 불러오지 못했습니다.");
      return (await res.json()) as BoardCommentsResponse;
    },
    enabled: commentType !== "video",
  });

  const videoQuery = useQuery({
    queryKey: [
      "admin-video-comments",
      { isHidden: filterHidden, search: debouncedSearch },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (filterHidden !== "all") params.set("isHidden", filterHidden);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(
        `/api/admin/video-comments?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("영상 댓글을 불러오지 못했습니다.");
      return (await res.json()) as VideoCommentsResponse;
    },
    enabled: commentType !== "board",
  });

  const isLoading =
    (commentType !== "video" && boardQuery.isLoading) ||
    (commentType !== "board" && videoQuery.isLoading);

  const error = boardQuery.error || videoQuery.error;

  // ---------------------------------------------------------------------------
  // Merge + sort
  // ---------------------------------------------------------------------------

  const mergedComments = useMemo(() => {
    const boardItems: UnifiedComment[] = (boardQuery.data?.data ?? []).map(
      (c: BoardCommentRow) => ({
        id: c.id,
        sourceType: "board" as const,
        content: c.content,
        isHidden: c.isHidden,
        likeCount: c.likeCount,
        createdAt: c.createdAt,
        author: c.author,
        sourceName: c.post?.title ?? "삭제된 게시글",
        sourceId: c.postId,
      }),
    );
    const videoItems: UnifiedComment[] = (videoQuery.data?.data ?? []).map(
      (c: VideoCommentRow) => ({
        id: c.id,
        sourceType: "video" as const,
        content: c.content,
        isHidden: c.isHidden,
        isPinned: c.isPinned,
        likeCount: c.likeCount,
        createdAt: c.createdAt,
        author: c.author,
        sourceName: c.video?.title ?? "삭제된 영상",
        sourceId: c.videoId,
      }),
    );
    return [...boardItems, ...videoItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [boardQuery.data, videoQuery.data]);

  // Counts for tabs
  const boardCount = boardQuery.data?.data?.length ?? 0;
  const videoCount = videoQuery.data?.data?.length ?? 0;
  const totalCount = mergedComments.length;

  // ---------------------------------------------------------------------------
  // Client-side pagination
  // ---------------------------------------------------------------------------

  const paginatedComments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return mergedComments.slice(start, start + pageSize);
  }, [mergedComments, currentPage]);

  const totalPages = Math.max(1, Math.ceil(mergedComments.length / pageSize));

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const allChecked =
    paginatedComments.length > 0 &&
    selectedRows.length === paginatedComments.length;
  const someChecked =
    selectedRows.length > 0 &&
    selectedRows.length < paginatedComments.length;

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedComments.map((c) => c.id));
    } else {
      setSelectedRows([]);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedRows((prev) => {
      if (checked) return [...prev, id];
      return prev.filter((r) => r !== id);
    });
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-board-comments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-video-comments"] });
  };

  const toggleHidden = async (comment: UnifiedComment) => {
    setSingleActionLoading(true);
    try {
      const endpoint =
        comment.sourceType === "board"
          ? `/api/admin/board-comments/${comment.id}`
          : `/api/admin/video-comments/${comment.id}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !comment.isHidden }),
      });
      if (!res.ok) throw new Error("처리에 실패했습니다.");
      invalidateAll();
      if (detailSheet?.id === comment.id) {
        setDetailSheet({ ...comment, isHidden: !comment.isHidden });
      }
      toast.success(
        comment.isHidden
          ? "댓글이 공개되었습니다."
          : "댓글이 숨김 처리되었습니다.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "처리에 실패했습니다.",
      );
    } finally {
      setSingleActionLoading(false);
    }
  };

  const deleteComment = async (comment: UnifiedComment) => {
    setSingleActionLoading(true);
    try {
      const endpoint =
        comment.sourceType === "board"
          ? `/api/admin/board-comments/${comment.id}`
          : `/api/admin/video-comments/${comment.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      invalidateAll();
      if (detailSheet?.id === comment.id) {
        setDetailSheet(null);
      }
      toast.success("댓글이 삭제되었습니다.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "삭제에 실패했습니다.",
      );
    } finally {
      setSingleActionLoading(false);
      setDeleteDialog({ open: false, comment: null });
    }
  };

  const handleBulkAction = async (action: "HIDE" | "UNHIDE" | "DELETE") => {
    setBulkActionLoading(true);
    try {
      const boardIds = selectedRows.filter((r) => {
        const comment = mergedComments.find((c) => c.id === r);
        return comment?.sourceType === "board";
      });
      const videoIds = selectedRows.filter((r) => {
        const comment = mergedComments.find((c) => c.id === r);
        return comment?.sourceType === "video";
      });

      const promises: Promise<Response>[] = [];
      if (boardIds.length > 0) {
        promises.push(
          fetch("/api/admin/board-comments/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commentIds: boardIds, action }),
          }),
        );
      }
      if (videoIds.length > 0) {
        promises.push(
          fetch("/api/admin/video-comments/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commentIds: videoIds, action }),
          }),
        );
      }

      const results = await Promise.all(promises);
      const allOk = results.every((r) => r.ok);
      if (!allOk) throw new Error("일부 처리에 실패했습니다.");

      invalidateAll();
      setSelectedRows([]);
      setBulkDeleteDialog(false);

      const actionLabel =
        action === "HIDE"
          ? "숨김"
          : action === "UNHIDE"
            ? "숨김 해제"
            : "삭제";
      toast.success(`${selectedRows.length}건 일괄 ${actionLabel} 완료되었습니다.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "일괄 처리에 실패했습니다.",
      );
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Row click
  const handleRowClick = (comment: UnifiedComment) => {
    setDetailSheet(comment);
  };

  // Filter tabs
  const filterTabs: { key: CommentType; label: string; count: number }[] = [
    { key: "all", label: "전체", count: totalCount },
    { key: "board", label: "게시판 댓글", count: boardCount },
    { key: "video", label: "영상 댓글", count: videoCount },
  ];

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    const refetch = () => {
      boardQuery.refetch();
      videoQuery.refetch();
    };
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          댓글 목록을 불러오지 못했습니다
        </p>
        <Button variant="outline" size="sm" onClick={refetch}>
          다시 시도
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* ── [A] Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            댓글 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            게시판 댓글과 영상 댓글을 통합 관리하세요.
          </p>
        </div>
      </div>

      {/* ── [B] Stats Cards ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2.5 rounded-xl bg-sky-500/10">
                <MessageSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  전체 댓글
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {totalCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  게시판 댓글
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {boardCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  영상 댓글
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {videoCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── [C] Filter Tabs + Search + Dropdown ────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div
              className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-max"
              role="tablist"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={commentType === tab.key}
                  onClick={() => handleCommentTypeChange(tab.key)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    commentType === tab.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="댓글 내용 또는 작성자 검색..."
              className="pl-9 bg-card border-border shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterHidden}
            onValueChange={(v) => {
              setFilterHidden(v as HiddenFilter);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] bg-card border-border shadow-sm">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="false">공개</SelectItem>
              <SelectItem value="true">숨김</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── [D/E] Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Skeleton className="h-4 w-4" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4">
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-10 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-14" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          {/* Mobile skeleton */}
          <div className="block md:hidden space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── Mobile view ──────────────────────────────────────── */}
          <div className="block md:hidden">
            {paginatedComments.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-muted/50 rounded-full">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {search
                        ? "검색 결과가 없습니다"
                        : "댓글이 없습니다"}
                    </p>
                    <p className="text-sm mt-1">
                      {search
                        ? "다른 검색어를 시도해 보세요."
                        : "새로운 댓글이 작성되면 여기에 표시됩니다."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {paginatedComments.map((row) => {
                  const SourceIcon = getSourceIcon(row.sourceType);
                  return (
                    <div
                      key={`${row.sourceType}-${row.id}`}
                      onClick={() => handleRowClick(row)}
                      className="bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "border-none shadow-none text-[10px]",
                              getSourceBadgeClass(row.sourceType),
                            )}
                          >
                            <SourceIcon className="h-3 w-3 mr-1" />
                            {SOURCE_TYPE_LABELS[row.sourceType]}
                          </Badge>
                          <Badge
                            className={cn(
                              "border-none shadow-none text-[10px]",
                              getHiddenBadgeClass(row.isHidden),
                            )}
                          >
                            {row.isHidden ? "숨김" : "공개"}
                          </Badge>
                        </div>
                        {row.likeCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            <span>{row.likeCount}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 mb-2">
                        {row.isHidden && (
                          <span className="text-rose-500 font-medium mr-1">
                            [숨김]
                          </span>
                        )}
                        {row.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">
                            {row.author.name}
                          </span>
                          <span>·</span>
                          <span className="truncate max-w-[120px]">
                            {row.sourceName}
                          </span>
                        </div>
                        <span>{formatRelativeTime(row.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Desktop table ────────────────────────────────────── */}
          <div className="hidden md:block">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={allChecked}
                          ref={(el) => {
                            if (el) {
                              (
                                el as unknown as HTMLButtonElement
                              ).dataset.state = someChecked
                                ? "indeterminate"
                                : allChecked
                                  ? "checked"
                                  : "unchecked";
                            }
                          }}
                          onCheckedChange={(checked) =>
                            toggleAll(checked === true)
                          }
                          aria-label="전체 선택"
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        내용 미리보기
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-20">
                        유형
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-36">
                        원본
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        작성자
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-16">
                        상태
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        날짜
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedComments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="p-3 bg-muted/50 rounded-full">
                              <MessageSquare className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">
                                {search
                                  ? "검색 결과가 없습니다"
                                  : "댓글이 없습니다"}
                              </p>
                              <p className="text-sm mt-1">
                                {search
                                  ? "다른 검색어를 시도해 보세요."
                                  : "새로운 댓글이 작성되면 여기에 표시됩니다."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedComments.map((row) => {
                        const SourceIcon = getSourceIcon(row.sourceType);
                        return (
                          <TableRow
                            key={`${row.sourceType}-${row.id}`}
                            className="hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => handleRowClick(row)}
                          >
                            {/* Checkbox */}
                            <TableCell
                              className="pl-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedRows.includes(row.id)}
                                onCheckedChange={(checked) =>
                                  toggleOne(row.id, checked === true)
                                }
                                aria-label={`댓글 선택`}
                              />
                            </TableCell>

                            {/* Content preview */}
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm text-foreground truncate max-w-[300px]">
                                  {row.isHidden && (
                                    <span className="text-rose-500 font-medium mr-1">
                                      [숨김]
                                    </span>
                                  )}
                                  {truncate(row.content, 60)}
                                </span>
                                {row.likeCount > 0 && (
                                  <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
                                    <Heart className="h-3 w-3" />
                                    <span className="text-xs">
                                      {row.likeCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Source type */}
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-none shadow-none",
                                  getSourceBadgeClass(row.sourceType),
                                )}
                              >
                                <SourceIcon className="h-3 w-3 mr-1" />
                                {SOURCE_TYPE_LABELS[row.sourceType]}
                              </Badge>
                            </TableCell>

                            {/* Source name */}
                            <TableCell>
                              <span className="text-sm text-muted-foreground truncate max-w-[140px] block">
                                {truncate(row.sourceName, 20)}
                              </span>
                            </TableCell>

                            {/* Author */}
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    {row.author.name.slice(0, 1)}
                                  </span>
                                </div>
                                <span className="text-sm text-foreground truncate">
                                  {row.author.name}
                                </span>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-none shadow-none",
                                  getHiddenBadgeClass(row.isHidden),
                                )}
                              >
                                {row.isHidden ? "숨김" : "공개"}
                              </Badge>
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-sm text-muted-foreground">
                              {formatRelativeTime(row.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {currentPage}
                      </span>{" "}
                      / {totalPages} 페이지
                      <span className="ml-2 text-xs">
                        (총 {mergedComments.length}건)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="h-8 px-2 lg:px-3"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1 hidden lg:block" />
                        이전
                      </Button>

                      <div className="flex items-center gap-1 mx-2">
                        {Array.from({
                          length: Math.min(totalPages, 5),
                        }).map((_, i) => {
                          let pNum = currentPage;
                          if (totalPages <= 5) pNum = i + 1;
                          else if (currentPage <= 3) pNum = i + 1;
                          else if (currentPage >= totalPages - 2)
                            pNum = totalPages - 4 + i;
                          else pNum = currentPage - 2 + i;

                          return (
                            <button
                              key={pNum}
                              onClick={() => setCurrentPage(pNum)}
                              className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                                currentPage === pNum
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {pNum}
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(totalPages, p + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 lg:px-3"
                      >
                        다음
                        <ChevronRight className="h-4 w-4 ml-1 hidden lg:block" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Mobile pagination ─────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="block md:hidden">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {currentPage}
                  </span>{" "}
                  / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  다음
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── [F] Floating Bulk Action Bar ───────────────────────────── */}
      <AnimatePresence>
        {selectedRows.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-2xl px-6 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedRows.length}건 선택됨
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("HIDE")}
              disabled={bulkActionLoading}
              className="border-border"
            >
              <EyeOff className="h-4 w-4 mr-1.5" />
              숨김
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("UNHIDE")}
              disabled={bulkActionLoading}
              className="border-border"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              숨김해제
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkDeleteDialog(true)}
              disabled={bulkActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              삭제
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedRows([])}
            >
              취소
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── [G] Bulk Delete Confirm Dialog ──────────────────────────── */}
      <AlertDialog
        open={bulkDeleteDialog}
        onOpenChange={setBulkDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRows.length}건의 댓글을 삭제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              선택된 댓글이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkDeleteDialog(false)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkAction("DELETE")}
              disabled={bulkActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {bulkActionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                "삭제 실행"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── [H] Single Delete Confirm Dialog ────────────────────────── */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>댓글을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 댓글이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteDialog.comment && (
            <div className="bg-muted/50 rounded-xl p-3 my-2">
              <p className="text-sm text-foreground line-clamp-3">
                {deleteDialog.comment.content}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                — {deleteDialog.comment.author.name}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setDeleteDialog({ open: false, comment: null })
              }
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.comment) {
                  deleteComment(deleteDialog.comment);
                }
              }}
              disabled={singleActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {singleActionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── [I] Sheet Detail Panel ─────────────────────────────────── */}
      <Sheet
        open={!!detailSheet}
        onOpenChange={(open) => !open && setDetailSheet(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 bg-card border-l border-border flex flex-col gap-0 shadow-2xl"
        >
          {detailSheet && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>댓글 상세 정보</SheetTitle>
                <SheetDescription>
                  댓글 상세 정보 및 관리 패널
                </SheetDescription>
              </SheetHeader>

              {/* Header */}
              <div className="relative bg-secondary p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "border-none shadow-none",
                        getSourceBadgeClass(detailSheet.sourceType),
                      )}
                    >
                      {detailSheet.sourceType === "board" ? (
                        <FileText className="h-3 w-3 mr-1" />
                      ) : (
                        <Video className="h-3 w-3 mr-1" />
                      )}
                      {SOURCE_TYPE_LABELS[detailSheet.sourceType]}
                    </Badge>
                    <Badge
                      className={cn(
                        "border-none shadow-none",
                        getHiddenBadgeClass(detailSheet.isHidden),
                      )}
                    >
                      {detailSheet.isHidden ? "숨김" : "공개"}
                    </Badge>
                    {detailSheet.isPinned && (
                      <Badge
                        variant="secondary"
                        className="border-none shadow-none"
                      >
                        고정됨
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(detailSheet.createdAt)}</span>
                  {detailSheet.likeCount > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>좋아요 {detailSheet.likeCount}개</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-6">
                  {/* Comment content */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        댓글 내용
                      </h3>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {detailSheet.content}
                      </p>
                    </div>
                  </div>

                  {/* Source context */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        {detailSheet.sourceType === "board"
                          ? "원본 게시글"
                          : "원본 영상"}
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                          {detailSheet.sourceType === "board" ? (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {detailSheet.sourceType === "board"
                              ? "게시글 제목"
                              : "영상 제목"}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {detailSheet.sourceName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            ID: {detailSheet.sourceId.slice(-8)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Author info */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        작성자 정보
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-muted-foreground">
                            {detailSheet.author.name.slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {detailSheet.author.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {detailSheet.author.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        빠른 조치
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full justify-start h-12 rounded-xl"
                        disabled={singleActionLoading}
                        onClick={() => toggleHidden(detailSheet)}
                      >
                        {singleActionLoading ? (
                          <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                        ) : detailSheet.isHidden ? (
                          <Eye className="h-4 w-4 mr-3 text-emerald-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 mr-3 text-amber-600" />
                        )}
                        <span className="font-medium">
                          {detailSheet.isHidden
                            ? "댓글 공개로 전환"
                            : "댓글 숨김 처리"}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full justify-start h-12 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        disabled={singleActionLoading}
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            comment: detailSheet,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        <span className="font-medium">댓글 삭제</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

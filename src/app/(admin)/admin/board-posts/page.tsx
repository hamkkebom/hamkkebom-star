"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertCircle,
  FileText,
  MessageSquare,
  Eye,
  EyeOff,
  Pin,
  Star,
  Megaphone,
  Trash2,
  Loader2,
  ThumbsUp,
  CalendarDays,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BoardType =
  | "FREE"
  | "QNA"
  | "TIPS"
  | "SHOWCASE"
  | "RECRUITMENT"
  | "NOTICE";

type BoardPostRow = {
  id: string;
  title: string;
  content: string;
  boardType: BoardType;
  isHidden: boolean;
  isPinned: boolean;
  isNotice: boolean;
  isFeatured: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  recentComments?: {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
  }[];
  reportCount?: number;
};

type BoardPostsResponse = {
  data: BoardPostRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    totalPosts: number;
    hiddenPosts: number;
    noticePosts: number;
    todayPosts: number;
  };
  boardTypeCounts: {
    all: number;
    FREE: number;
    QNA: number;
    TIPS: number;
    SHOWCASE: number;
    RECRUITMENT: number;
    NOTICE: number;
  };
};

type FilterBoardType =
  | "ALL"
  | "FREE"
  | "QNA"
  | "TIPS"
  | "SHOWCASE"
  | "RECRUITMENT"
  | "NOTICE";

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  FREE: "자유",
  QNA: "Q&A",
  TIPS: "팁",
  SHOWCASE: "쇼케이스",
  RECRUITMENT: "구인",
  NOTICE: "공지",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

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
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getBoardTypeBadgeClass(type: BoardType): string {
  switch (type) {
    case "FREE":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    case "QNA":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "TIPS":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "SHOWCASE":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "RECRUITMENT":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "NOTICE":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  }
}

// ---------------------------------------------------------------------------
// Stats cards config
// ---------------------------------------------------------------------------

const STATS_CARDS = [
  {
    key: "totalPosts" as const,
    label: "전체 게시글",
    icon: FileText,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "hiddenPosts" as const,
    label: "숨김 상태",
    icon: EyeOff,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    key: "noticePosts" as const,
    label: "공지사항",
    icon: Megaphone,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "todayPosts" as const,
    label: "오늘 작성",
    icon: CalendarDays,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminBoardPostsPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterBoardType, setFilterBoardType] =
    useState<FilterBoardType>("ALL");
  const [filterHidden, setFilterHidden] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<BoardPostRow | null>(null);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    postId: string;
    postTitle: string;
  }>({ open: false, postId: "", postTitle: "" });

  // Bulk delete confirmation
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  // Search debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Clear selections on filter/page change
  useEffect(() => {
    setSelectedRows(new Set()); // eslint-disable-line react-hooks/set-state-in-effect -- reset on filter change
  }, [filterBoardType, filterHidden, page]);

  // Filter change handler
  const handleBoardTypeChange = useCallback(
    (newFilter: FilterBoardType) => {
      if (newFilter === filterBoardType) return;
      setFilterBoardType(newFilter);
      setPage(1);
    },
    [filterBoardType]
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const queryKey = useMemo(
    () => [
      "admin-board-posts",
      {
        boardType: filterBoardType,
        isHidden: filterHidden,
        search: debouncedSearch,
        sort: sortBy,
        page,
        pageSize,
      },
    ],
    [filterBoardType, filterHidden, debouncedSearch, sortBy, page, pageSize]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filterBoardType !== "ALL") params.set("boardType", filterBoardType);
      if (filterHidden !== "all") params.set("isHidden", filterHidden);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sortBy !== "newest") params.set("sort", sortBy);

      const res = await fetch(`/api/admin/board-posts?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("게시글 목록을 불러오지 못했습니다.");
      return (await res.json()) as BoardPostsResponse;
    },
  });

  // Update post flags mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data: updateData,
    }: {
      id: string;
      data: Record<string, boolean>;
    }) => {
      const res = await fetch(`/api/admin/board-posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "업데이트에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-board-posts"] });
      toast.success("게시글이 업데이트되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/admin/board-posts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "삭제에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-board-posts"] });
      setSelectedPost(null);
      setDeleteDialog({ open: false, postId: "", postTitle: "" });
      toast.success("게시글이 삭제되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Bulk action mutation
  const bulkMutation = useMutation({
    mutationFn: async ({
      postIds,
      action,
    }: {
      postIds: string[];
      action: string;
    }) => {
      const res = await fetch("/api/admin/board-posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds, action }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "일괄 처리에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: (_, variables) => {
      setSelectedRows(new Set());
      setBulkDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["admin-board-posts"] });
      const actionLabels: Record<string, string> = {
        HIDE: "숨김",
        UNHIDE: "숨김 해제",
        PIN: "고정",
        UNPIN: "고정 해제",
        DELETE: "삭제",
      };
      toast.success(
        `${variables.postIds.length}건이 ${actionLabels[variables.action] ?? "처리"}되었습니다.`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const rows = useMemo(() => data?.data ?? [], [data]);
  const totalPages = data?.totalPages ?? 1;
  const stats = useMemo(
    () =>
      data?.stats ?? {
        totalPosts: 0,
        hiddenPosts: 0,
        noticePosts: 0,
        todayPosts: 0,
      },
    [data]
  );
  const boardTypeCounts = useMemo(
    () =>
      data?.boardTypeCounts ?? {
        all: 0,
        FREE: 0,
        QNA: 0,
        TIPS: 0,
        SHOWCASE: 0,
        RECRUITMENT: 0,
        NOTICE: 0,
      },
    [data]
  );

  const handleRowClick = useCallback((post: BoardPostRow) => {
    setSelectedPost(post);
  }, []);

  // Checkbox helpers
  const allChecked = rows.length > 0 && selectedRows.size === rows.length;
  const someChecked = selectedRows.size > 0 && selectedRows.size < rows.length;

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(new Set(rows.map((r) => r.id)));
      } else {
        setSelectedRows(new Set());
      }
    },
    [rows]
  );

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    (action: string) => {
      if (action === "DELETE") {
        setBulkDeleteDialog(true);
        return;
      }
      bulkMutation.mutate({
        postIds: Array.from(selectedRows),
        action,
      });
    },
    [selectedRows, bulkMutation]
  );

  const handleToggleFlag = useCallback(
    (postId: string, flag: string, currentValue: boolean) => {
      updateMutation.mutate({
        id: postId,
        data: { [flag]: !currentValue },
      });
    },
    [updateMutation]
  );

  // Filter tabs
  const filterTabs = useMemo<
    { key: FilterBoardType; label: string; count: number }[]
  >(
    () => [
      { key: "ALL", label: "전체", count: boardTypeCounts.all },
      { key: "FREE", label: "자유", count: boardTypeCounts.FREE },
      { key: "QNA", label: "Q&A", count: boardTypeCounts.QNA },
      { key: "TIPS", label: "팁", count: boardTypeCounts.TIPS },
      { key: "SHOWCASE", label: "쇼케이스", count: boardTypeCounts.SHOWCASE },
      { key: "RECRUITMENT", label: "구인", count: boardTypeCounts.RECRUITMENT },
      { key: "NOTICE", label: "공지", count: boardTypeCounts.NOTICE },
    ],
    [boardTypeCounts]
  );

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          게시글 목록을 불러오지 못했습니다
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
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
      {/* -- [A] Header --------------------------------------------------- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            게시글 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            커뮤니티 게시글을 관리하고 상태를 변경하세요.
          </p>
        </div>
      </div>

      {/* -- [B] Stats Cards ---------------------------------------------- */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {STATS_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} className="bg-card border-border shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn("p-2.5 rounded-xl", card.iconBg)}>
                    <Icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats[card.key]}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* -- [C] Filter Tabs + Search + Dropdowns ------------------------- */}
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
                  aria-selected={filterBoardType === tab.key}
                  onClick={() => handleBoardTypeChange(tab.key)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    filterBoardType === tab.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
              placeholder="제목 또는 작성자 검색..."
              className="pl-9 bg-card border-border shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterHidden} onValueChange={setFilterHidden}>
            <SelectTrigger className="w-[130px] bg-card border-border shadow-sm">
              <SelectValue placeholder="공개 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="false">공개</SelectItem>
              <SelectItem value="true">숨김</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] bg-card border-border shadow-sm">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="views">조회순</SelectItem>
              <SelectItem value="likes">좋아요순</SelectItem>
              <SelectItem value="comments">댓글순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* -- [D/E] Content ------------------------------------------------ */}
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
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
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
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
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
          {/* -- Mobile view -------------------------------------------- */}
          <div className="block md:hidden">
            {rows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-muted/50 rounded-full">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {search
                        ? "검색 결과가 없습니다"
                        : "게시글이 없습니다"}
                    </p>
                    <p className="text-sm mt-1">
                      {search
                        ? "다른 검색어를 시도해 보세요."
                        : "새로운 게시글이 작성되면 여기에 표시됩니다."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className="bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={cn(
                            "border-none shadow-none text-[10px]",
                            getBoardTypeBadgeClass(row.boardType)
                          )}
                        >
                          {BOARD_TYPE_LABELS[row.boardType]}
                        </Badge>
                        {row.isHidden && (
                          <Badge className="border-none shadow-none text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400">
                            숨김
                          </Badge>
                        )}
                        {row.isPinned && (
                          <Badge className="border-none shadow-none text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            고정
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatRelativeTime(row.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                      {row.title}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{row.author.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {row.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {row.commentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {row.likeCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* -- Desktop table ----------------------------------------- */}
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
                        제목
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-20">
                        게시판
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        작성자
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-32">
                        상태
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-28">
                        통계
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-20">
                        날짜
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="p-3 bg-muted/50 rounded-full">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">
                                {search
                                  ? "검색 결과가 없습니다"
                                  : "게시글이 없습니다"}
                              </p>
                              <p className="text-sm mt-1">
                                {search
                                  ? "다른 검색어를 시도해 보세요."
                                  : "새로운 게시글이 작성되면 여기에 표시됩니다."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => handleRowClick(row)}
                        >
                          {/* Checkbox */}
                          <TableCell
                            className="pl-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedRows.has(row.id)}
                              onCheckedChange={(checked) =>
                                toggleOne(row.id, checked === true)
                              }
                              aria-label={`게시글 "${row.title}" 선택`}
                            />
                          </TableCell>

                          {/* Title */}
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm text-foreground truncate max-w-[300px]">
                                {row.title}
                              </span>
                              {row.isNotice && (
                                <Badge className="border-none shadow-none text-[10px] px-1.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                                  공지
                                </Badge>
                              )}
                              {row.isHidden && (
                                <Badge className="border-none shadow-none text-[10px] px-1.5 bg-muted text-muted-foreground shrink-0">
                                  숨김
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Board type */}
                          <TableCell>
                            <Badge
                              className={cn(
                                "border-none shadow-none",
                                getBoardTypeBadgeClass(row.boardType)
                              )}
                            >
                              {BOARD_TYPE_LABELS[row.boardType]}
                            </Badge>
                          </TableCell>

                          {/* Author */}
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="text-sm text-foreground truncate">
                                {row.author.name}
                              </span>
                            </div>
                          </TableCell>

                          {/* Status flags */}
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {row.isPinned && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 border-none shadow-none bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                >
                                  고정
                                </Badge>
                              )}
                              {row.isFeatured && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 border-none shadow-none bg-violet-500/15 text-violet-600 dark:text-violet-400"
                                >
                                  추천
                                </Badge>
                              )}
                              {row.isNotice && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 border-none shadow-none bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                >
                                  공지
                                </Badge>
                              )}
                              {row.isHidden && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 border-none shadow-none bg-muted text-muted-foreground"
                                >
                                  숨김
                                </Badge>
                              )}
                              {!row.isPinned &&
                                !row.isFeatured &&
                                !row.isNotice &&
                                !row.isHidden && (
                                  <span className="text-xs text-muted-foreground">
                                    일반
                                  </span>
                                )}
                            </div>
                          </TableCell>

                          {/* Stats */}
                          <TableCell>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span
                                className="flex items-center gap-1"
                                title="조회수"
                              >
                                <Eye className="h-3 w-3" />
                                {row.viewCount}
                              </span>
                              <span
                                className="flex items-center gap-1"
                                title="댓글수"
                              >
                                <MessageSquare className="h-3 w-3" />
                                {row.commentCount}
                              </span>
                              <span
                                className="flex items-center gap-1"
                                title="좋아요"
                              >
                                <ThumbsUp className="h-3 w-3" />
                                {row.likeCount}
                              </span>
                            </div>
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-sm text-muted-foreground">
                            {formatRelativeTime(row.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {page}
                      </span>{" "}
                      / {totalPages} 페이지
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 px-2 lg:px-3"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1 hidden lg:block" />
                        이전
                      </Button>

                      <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: Math.min(totalPages, 5) }).map(
                          (_, i) => {
                            let pNum = page;
                            if (totalPages <= 5) pNum = i + 1;
                            else if (page <= 3) pNum = i + 1;
                            else if (page >= totalPages - 2)
                              pNum = totalPages - 4 + i;
                            else pNum = page - 2 + i;

                            return (
                              <button
                                key={pNum}
                                onClick={() => setPage(pNum)}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                                  page === pNum
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {pNum}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
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
        </>
      )}

      {/* -- [F] Floating Bulk Action Bar --------------------------------- */}
      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-2xl px-6 py-3 flex items-center gap-3 flex-wrap justify-center"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedRows.size}건 선택됨
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("HIDE")}
              disabled={bulkMutation.isPending}
              className="border-border"
            >
              <EyeOff className="h-4 w-4 mr-1.5" />
              숨김
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("UNHIDE")}
              disabled={bulkMutation.isPending}
              className="border-border"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              숨김 해제
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("PIN")}
              disabled={bulkMutation.isPending}
              className="border-border"
            >
              <Pin className="h-4 w-4 mr-1.5" />
              고정
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("UNPIN")}
              disabled={bulkMutation.isPending}
              className="border-border"
            >
              고정 해제
            </Button>
            <Button
              size="sm"
              onClick={() => handleBulkAction("DELETE")}
              disabled={bulkMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              삭제
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedRows(new Set())}
            >
              취소
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- [G] Bulk Delete Confirm Dialog -------------------------------- */}
      <AlertDialog
        open={bulkDeleteDialog}
        onOpenChange={setBulkDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRows.size}건의 게시글을 삭제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              선택된 게시글이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkDeleteDialog(false)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkMutation.mutate({
                  postIds: Array.from(selectedRows),
                  action: "DELETE",
                });
              }}
              disabled={bulkMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {bulkMutation.isPending ? "처리 중..." : "삭제 실행"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* -- [H] Single Delete Confirm Dialog ----------------------------- */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteDialog.postTitle}&rdquo; 게시글이 삭제됩니다. 이
              작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setDeleteDialog({ open: false, postId: "", postTitle: "" })
              }
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate({ id: deleteDialog.postId });
              }}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? "처리 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* -- [I] Sheet Detail Panel --------------------------------------- */}
      <Sheet
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 bg-card border-l border-border flex flex-col gap-0 shadow-2xl"
        >
          {selectedPost && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>
                  게시글 &ldquo;{selectedPost.title}&rdquo; 상세 정보
                </SheetTitle>
                <SheetDescription>
                  게시글 상세 정보 및 관리
                </SheetDescription>
              </SheetHeader>

              {/* Header */}
              <div className="relative bg-secondary p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    className={cn(
                      "border-none shadow-none",
                      getBoardTypeBadgeClass(selectedPost.boardType)
                    )}
                  >
                    {BOARD_TYPE_LABELS[selectedPost.boardType]}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    #{selectedPost.id.slice(-6)}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground line-clamp-2 mb-3">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {selectedPost.isHidden && (
                    <Badge className="border-none shadow-none bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      숨김
                    </Badge>
                  )}
                  {selectedPost.isPinned && (
                    <Badge className="border-none shadow-none bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      고정
                    </Badge>
                  )}
                  {selectedPost.isNotice && (
                    <Badge className="border-none shadow-none bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      공지
                    </Badge>
                  )}
                  {selectedPost.isFeatured && (
                    <Badge className="border-none shadow-none bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      추천
                    </Badge>
                  )}
                  {!selectedPost.isHidden &&
                    !selectedPost.isPinned &&
                    !selectedPost.isNotice &&
                    !selectedPost.isFeatured && (
                      <Badge variant="secondary" className="border-none shadow-none">
                        일반
                      </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{selectedPost.author.name}</span>
                  <span>·</span>
                  <span>{formatDate(selectedPost.createdAt)}</span>
                </div>
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-xl p-3 text-center">
                      <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">조회수</p>
                      <p className="text-lg font-bold text-foreground">
                        {selectedPost.viewCount}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3 text-center">
                      <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">댓글</p>
                      <p className="text-lg font-bold text-foreground">
                        {selectedPost.commentCount}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3 text-center">
                      <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">좋아요</p>
                      <p className="text-lg font-bold text-foreground">
                        {selectedPost.likeCount}
                      </p>
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        빠른 작업
                      </h3>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start",
                          selectedPost.isHidden &&
                            "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        )}
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          handleToggleFlag(
                            selectedPost.id,
                            "isHidden",
                            selectedPost.isHidden
                          )
                        }
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <EyeOff className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedPost.isHidden ? "숨김 해제" : "숨김"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start",
                          selectedPost.isPinned &&
                            "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        )}
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          handleToggleFlag(
                            selectedPost.id,
                            "isPinned",
                            selectedPost.isPinned
                          )
                        }
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Pin className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedPost.isPinned ? "고정 해제" : "고정"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start",
                          selectedPost.isNotice &&
                            "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        )}
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          handleToggleFlag(
                            selectedPost.id,
                            "isNotice",
                            selectedPost.isNotice
                          )
                        }
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Megaphone className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedPost.isNotice ? "공지 해제" : "공지"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start",
                          selectedPost.isFeatured &&
                            "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400"
                        )}
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          handleToggleFlag(
                            selectedPost.id,
                            "isFeatured",
                            selectedPost.isFeatured
                          )
                        }
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedPost.isFeatured ? "추천 해제" : "추천"}
                      </Button>
                    </div>
                  </div>

                  {/* Content preview */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        본문 미리보기
                      </h3>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {selectedPost.content.length > 500
                          ? `${selectedPost.content.slice(0, 500)}...`
                          : selectedPost.content}
                      </p>
                      {selectedPost.content.length > 500 && (
                        <p className="text-xs text-muted-foreground mt-3">
                          전체 {selectedPost.content.length}자 중 500자까지
                          표시됨
                        </p>
                      )}
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
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {selectedPost.author.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedPost.author.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent comments */}
                  {selectedPost.recentComments &&
                    selectedPost.recentComments.length > 0 && (
                      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="bg-muted/50 px-5 py-3 border-b border-border">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            최근 댓글 ({selectedPost.recentComments.length}건)
                          </h3>
                        </div>
                        <div className="p-5 space-y-3">
                          {selectedPost.recentComments
                            .slice(0, 5)
                            .map((comment) => (
                              <div
                                key={comment.id}
                                className="flex items-start gap-3"
                              >
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-foreground">
                                      {comment.authorName}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {formatRelativeTime(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Report count */}
                  {selectedPost.reportCount !== undefined &&
                    selectedPost.reportCount > 0 && (
                      <div className="bg-rose-500/5 rounded-2xl border border-rose-500/20 p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                            신고 {selectedPost.reportCount}건 접수됨
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Delete button */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full font-bold h-12 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.98] transition-all"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      setDeleteDialog({
                        open: true,
                        postId: selectedPost.id,
                        postTitle: selectedPost.title,
                      });
                    }}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        게시글 삭제
                      </>
                    )}
                  </Button>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

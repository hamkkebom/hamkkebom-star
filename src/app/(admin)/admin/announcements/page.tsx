"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Trash2,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnnouncementPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isRead: boolean;
  author: {
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
};

type AnnouncementsResponse = {
  data: AnnouncementRow[];
  unreadCount: number;
};

type FormData = {
  title: string;
  priority: AnnouncementPriority;
  content: string;
};

type FilterPriority = "all" | AnnouncementPriority;

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

const PRIORITY_BADGE_CLASS: Record<AnnouncementPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  HIGH: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  URGENT: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const PRIORITY_ORDER: AnnouncementPriority[] = [
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
];

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

function formatShortDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

const EMPTY_FORM: FormData = {
  title: "",
  priority: "NORMAL",
  content: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementRow | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    title: string;
  }>({ open: false, id: "", title: "" });

  // Search debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      if (!res.ok) throw new Error("공지사항 목록을 불러오지 못했습니다.");
      return (await res.json()) as AnnouncementsResponse;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "공지사항 작성에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      closeDialog();
      toast.success("공지사항이 등록되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<FormData & { isActive: boolean }>;
    }) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "수정에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      closeDialog();
      toast.success("공지사항이 수정되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "삭제에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      setDeleteDialog({ open: false, id: "", title: "" });
      toast.success("공지사항이 삭제되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const rows = data?.data ?? [];

  const filteredRows = useMemo(() => {
    let result = rows;

    // Priority filter
    if (filterPriority !== "all") {
      result = result.filter((r) => r.priority === filterPriority);
    }

    // Search filter (client-side, title match)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, filterPriority, debouncedSearch]);

  // Counts per priority
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const p of PRIORITY_ORDER) {
      counts[p] = rows.filter((r) => r.priority === p).length;
    }
    return counts;
  }, [rows]);

  // Filter tabs
  const filterTabs: { key: FilterPriority; label: string; count: number }[] = [
    { key: "all", label: "전체", count: priorityCounts.all ?? 0 },
    { key: "URGENT", label: "긴급", count: priorityCounts.URGENT ?? 0 },
    { key: "HIGH", label: "높음", count: priorityCounts.HIGH ?? 0 },
    { key: "NORMAL", label: "보통", count: priorityCounts.NORMAL ?? 0 },
    { key: "LOW", label: "낮음", count: priorityCounts.LOW ?? 0 },
  ];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (newFilter: FilterPriority) => {
      if (newFilter === filterPriority) return;
      setFilterPriority(newFilter);
    },
    [filterPriority]
  );

  const openCreateDialog = useCallback(() => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((item: AnnouncementRow) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      priority: item.priority,
      content: item.content,
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        payload: {
          title: formData.title.trim(),
          priority: formData.priority,
          content: formData.content.trim(),
        },
      });
    } else {
      createMutation.mutate({
        title: formData.title.trim(),
        priority: formData.priority,
        content: formData.content.trim(),
      });
    }
  }, [formData, editingItem, createMutation, updateMutation]);

  const handleDeactivate = useCallback(
    (item: AnnouncementRow) => {
      updateMutation.mutate(
        { id: item.id, payload: { isActive: false } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ["admin-announcements"],
            });
            toast.success("비활성화되었습니다.");
          },
        }
      );
    },
    [updateMutation, queryClient]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteDialog.id) return;
    deleteMutation.mutate(deleteDialog.id);
  }, [deleteDialog.id, deleteMutation]);

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          공지사항 목록을 불러오지 못했습니다
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
      {/* ── [A] Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            공지사항 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            공지사항을 작성하고 관리하세요. 활성 공지만 표시됩니다.
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          새 공지 작성
        </Button>
      </div>

      {/* ── [B] Filter Tabs + Search ───────────────────────────────── */}
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
                aria-selected={filterPriority === tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  filterPriority === tab.key
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
            placeholder="제목 또는 내용 검색..."
            className="pl-9 bg-card border-border shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── [C/D] Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-6" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 rounded-md" />
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
            {filteredRows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-muted/50 rounded-full">
                    <Megaphone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {debouncedSearch
                        ? "검색 결과가 없습니다"
                        : "공지사항이 없습니다"}
                    </p>
                    <p className="text-sm mt-1">
                      {debouncedSearch
                        ? "다른 검색어를 시도해 보세요."
                        : "새 공지사항을 작성해 보세요."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {filteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-card border border-border rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {(row.priority === "URGENT" ||
                          row.priority === "HIGH") && (
                          <span className="shrink-0 text-sm">📌</span>
                        )}
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {row.title}
                        </h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">메뉴 열기</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(row)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeactivate(row)}
                          >
                            <EyeOff className="h-4 w-4 mr-2" />
                            비활성화
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                id: row.id,
                                title: row.title,
                              })
                            }
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {row.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "border-none shadow-none text-[10px]",
                            PRIORITY_BADGE_CLASS[row.priority]
                          )}
                        >
                          {PRIORITY_LABELS[row.priority]}
                        </Badge>
                        <span>{row.author.name}</span>
                      </div>
                      <span>{formatShortDate(row.createdAt)}</span>
                    </div>
                  </div>
                ))}
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
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        제목
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        우선순위
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        작성자
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-32">
                        작성일
                      </TableHead>
                      <TableHead className="w-10 font-semibold text-xs text-muted-foreground">
                        <span className="sr-only">액션</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="p-3 bg-muted/50 rounded-full">
                              <Megaphone className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">
                                {debouncedSearch
                                  ? "검색 결과가 없습니다"
                                  : "공지사항이 없습니다"}
                              </p>
                              <p className="text-sm mt-1">
                                {debouncedSearch
                                  ? "다른 검색어를 시도해 보세요."
                                  : "새 공지사항을 작성해 보세요."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-muted/50 transition-colors group"
                        >
                          {/* Title */}
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              {(row.priority === "URGENT" ||
                                row.priority === "HIGH") && (
                                <span className="shrink-0 text-sm">📌</span>
                              )}
                              <span className="text-sm font-medium text-foreground truncate max-w-[350px]">
                                {row.title}
                              </span>
                            </div>
                          </TableCell>

                          {/* Priority */}
                          <TableCell>
                            <Badge
                              className={cn(
                                "border-none shadow-none",
                                PRIORITY_BADGE_CLASS[row.priority]
                              )}
                            >
                              {PRIORITY_LABELS[row.priority]}
                            </Badge>
                          </TableCell>

                          {/* Author */}
                          <TableCell className="text-sm text-muted-foreground">
                            {row.author.name}
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(row.createdAt)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">메뉴 열기</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(row)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  수정
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeactivate(row)}
                                >
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  비활성화
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      id: row.id,
                                      title: row.title,
                                    })
                                  }
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── [E] Create/Edit Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {editingItem ? "공지사항 수정" : "새 공지 작성"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "공지사항 내용을 수정하세요."
                : "새로운 공지사항을 작성하세요."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                제목 <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="공지사항 제목을 입력하세요"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="bg-card border-border"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                우선순위
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: v as AnnouncementPriority,
                  }))
                }
              >
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                내용 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="공지사항 내용을 입력하세요..."
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={5}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isMutating ||
                !formData.title.trim() ||
                !formData.content.trim()
              }
            >
              {isMutating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : editingItem ? (
                "수정"
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── [F] Delete AlertDialog ──────────────────────────────────── */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteDialog.title}&quot;을(를) 삭제합니다. 이 작업은 되돌릴
              수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setDeleteDialog({ open: false, id: "", title: "" })
              }
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

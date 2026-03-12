"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import {
  Search,
  Plus,
  HelpCircle,
  Pencil,
  Trash2,
  ChevronDown,
  Loader2,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FaqItemRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  targetRole: string;
  createdAt: string;
  updatedAt: string;
};

type FaqFormData = {
  question: string;
  answer: string;
  category: string;
  targetRole: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAQ_CATEGORIES = [
  { value: "일반", label: "일반" },
  { value: "프로젝트", label: "프로젝트" },
  { value: "정산", label: "정산" },
  { value: "영상", label: "영상" },
  { value: "기타", label: "기타" },
];

const TARGET_ROLE_LABELS: Record<string, string> = {
  ALL: "전체",
  STAR: "STAR 전용",
  ADMIN: "ADMIN 전용",
};

const TARGET_ROLE_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "STAR", label: "STAR 전용" },
  { value: "ADMIN", label: "ADMIN 전용" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminFaqPage() {
  const queryClient = useQueryClient();

  // ── State ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItemRow | null>(null);

  // Form state
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formCategory, setFormCategory] = useState("일반");
  const [formTargetRole, setFormTargetRole] = useState("ALL");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<FaqItemRow | null>(null);

  // Collapsible state: track which categories are collapsed
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Search debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Data Fetching ───────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-faq"],
    queryFn: async () => {
      const res = await fetch("/api/admin/faq", { cache: "no-store" });
      if (!res.ok) throw new Error("FAQ 목록을 불러오지 못했습니다.");
      return (await res.json()) as { data: FaqItemRow[] };
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: FaqFormData) => {
      const res = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "FAQ 생성에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq"] });
      closeDialog();
      toast.success("FAQ가 추가되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<FaqFormData & { sortOrder: number; isPublished: boolean }>;
    }) => {
      const res = await fetch(`/api/admin/faq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "FAQ 수정에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq"] });
      closeDialog();
      toast.success("FAQ가 수정되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/faq/${id}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "FAQ 삭제에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq"] });
      setDeleteTarget(null);
      toast.success("FAQ가 삭제되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Derived: Category grouping ──────────────────────────────────────

  const groupedByCategory = useMemo(() => {
    const items = data?.data ?? [];
    const filtered = items.filter((item: FaqItemRow) => {
      const matchesSearch =
        !debouncedSearch ||
        item.question.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.answer.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
    const groups = new Map<string, FaqItemRow[]>();
    for (const item of filtered) {
      const existing = groups.get(item.category) || [];
      existing.push(item);
      groups.set(item.category, existing);
    }
    return groups;
  }, [data, debouncedSearch, filterCategory]);

  const totalFilteredCount = useMemo(() => {
    let count = 0;
    for (const items of groupedByCategory.values()) {
      count += items.length;
    }
    return count;
  }, [groupedByCategory]);

  // Extract unique categories from data for filter dropdown
  const availableCategories = useMemo(() => {
    const items = data?.data ?? [];
    const cats = new Set<string>();
    for (const item of items) {
      cats.add(item.category);
    }
    return Array.from(cats).sort();
  }, [data]);

  // ── Dialog Handlers ─────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("일반");
    setFormTargetRole("ALL");
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((item: FaqItemRow) => {
    setEditingItem(item);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormCategory(item.category);
    setFormTargetRole(item.targetRole);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("일반");
    setFormTargetRole("ALL");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formQuestion.trim()) {
      toast.error("질문을 입력해주세요.");
      return;
    }
    if (!formAnswer.trim()) {
      toast.error("답변을 입력해주세요.");
      return;
    }

    const payload: FaqFormData = {
      question: formQuestion.trim(),
      answer: formAnswer.trim(),
      category: formCategory,
      targetRole: formTargetRole,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }, [
    formQuestion,
    formAnswer,
    formCategory,
    formTargetRole,
    editingItem,
    updateMutation,
    createMutation,
  ]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  // Collapsible toggle
  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Error state ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          FAQ 목록을 불러오지 못했습니다
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── [A] Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            FAQ 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            자주 묻는 질문을 카테고리별로 관리하세요.
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          새 FAQ 추가
        </Button>
      </div>

      {/* ── [B] Filters: Category Select + Search ──────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] bg-card border-border shadow-sm">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isLoading && (
            <span className="text-xs text-muted-foreground">
              {totalFilteredCount}개 항목
            </span>
          )}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="질문 또는 답변 검색..."
            className="pl-9 bg-card border-border shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── [C] Content ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <div className="space-y-2 pl-2">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : groupedByCategory.size === 0 ? (
        /* ── Empty State ────────────────────────────────────────── */
        <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-muted/50 rounded-full">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {search || filterCategory !== "all"
                  ? "검색 결과가 없습니다"
                  : "등록된 FAQ가 없습니다"}
              </p>
              <p className="text-sm mt-1">
                {search || filterCategory !== "all"
                  ? "다른 검색어나 카테고리를 시도해 보세요."
                  : "새 FAQ를 추가하면 여기에 표시됩니다."}
              </p>
            </div>
            {!search && filterCategory === "all" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                첫 FAQ 추가하기
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* ── Category Groups ────────────────────────────────────── */
        <div className="space-y-4">
          {Array.from(groupedByCategory.entries()).map(
            ([category, items]) => {
              const isCollapsed = collapsedCategories.has(category);
              return (
                <div
                  key={category}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm text-foreground">
                        {category}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5"
                      >
                        {items.length}개
                      </Badge>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                  </button>

                  {/* Category items */}
                  {!isCollapsed && (
                    <div className="border-t border-border">
                      <div className="divide-y divide-border">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">
                                Q: {item.question}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                A: {item.answer}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {!item.isPublished && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    비공개
                                  </Badge>
                                )}
                                {item.targetRole !== "ALL" && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {TARGET_ROLE_LABELS[item.targetRole] ??
                                      item.targetRole}
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(item.updatedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">수정</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(item)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">삭제</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ── [D] Create / Edit Dialog ───────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {editingItem ? "FAQ 수정" : "새 FAQ 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "FAQ 내용을 수정하세요."
                : "새로운 FAQ를 등록하세요."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                카테고리 <span className="text-destructive">*</span>
              </Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {FAQ_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target role */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                대상 <span className="text-destructive">*</span>
              </Label>
              <Select value={formTargetRole} onValueChange={setFormTargetRole}>
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue placeholder="대상 선택" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                질문 <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="자주 묻는 질문을 입력하세요..."
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                className="bg-card border-border"
              />
            </div>

            {/* Answer */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                답변 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="답변을 입력하세요..."
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
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
                isSaving || !formQuestion.trim() || !formAnswer.trim()
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
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

      {/* ── [E] Delete AlertDialog ─────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>FAQ를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  &quot;{deleteTarget.question}&quot; 항목이 영구적으로
                  삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  GripVertical,
  Plus,
  MoreVertical,
  Trash2,
  Pencil,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  GRADE_COLOR_PRESETS,
  UNASSIGNED_CONFIG,
  getGradeColor,
  type GradeColorKey,
} from "@/lib/grade-config";
import {
  gradeFormSchema,
  type GradeFormInput,
} from "@/lib/validations/grade";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

// --- Types ---

type Star = {
  id: string;
  name: string;
  chineseName: string | null;
  avatarUrl: string | null;
  baseRate: number | null;
  isApproved: boolean;
  _count: { assignments: number; submissions: number; videos: number };
};

type Grade = {
  id: string;
  name: string;
  baseRate: number;
  color: string;
  sortOrder: number;
  users: Star[];
};

type BoardData = {
  data: { grades: Grade[]; unassigned: Star[] };
  _debug?: string[];
};

// --- StarCard (draggable) ---

function StarCard({
  star,
  fromGradeId,
  overlay,
}: {
  star: Star;
  fromGradeId: string;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: star.id,
      data: { star, fromGradeId },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const displayName = star.chineseName || star.name;

  return (
    <motion.div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging && !overlay ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow",
        overlay && "rotate-2 scale-105 shadow-2xl ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/admin/stars/${star.id}`}
            className="text-sm font-medium hover:underline truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {displayName}
          </Link>
          <p className="text-xs text-muted-foreground tabular-nums">
            {star.baseRate
              ? `₩${Number(star.baseRate).toLocaleString()}`
              : "단가 미설정"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {star._count.videos > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {star._count.videos}건
            </Badge>
          )}
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  );
}

// --- GradeColumn (droppable) ---

function GradeColumn({
  grade,
  onEdit,
  onDelete,
}: {
  grade: Grade;
  onEdit: (grade: Grade) => void;
  onDelete: (grade: Grade) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: grade.id });
  const colors = getGradeColor(grade.color);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[280px] rounded-lg",
        colors.border,
        colors.bg,
        isOver && "ring-2 ring-primary/60 bg-primary/5"
      )}
    >
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={cn(colors.badge, "font-semibold shrink-0")}>
            {grade.name}
          </Badge>
          <span className="text-sm font-medium tabular-nums truncate">
            ₩{Number(grade.baseRate).toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {grade.users.length}명
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(grade)}>
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(grade)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-3 pb-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {grade.users.length > 0 ? (
            grade.users.map((star) => (
              <StarCard key={star.id} star={star} fromGradeId={grade.id} />
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center"
            >
              <GripVertical className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">
                STAR를 이 등급으로 드래그하세요
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- UnassignedColumn (droppable) ---

function UnassignedColumn({ stars, onBulkRate }: { stars: Star[]; onBulkRate: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[280px] rounded-lg",
        UNASSIGNED_CONFIG.border,
        UNASSIGNED_CONFIG.bg,
        isOver && "ring-2 ring-primary/60 bg-primary/5"
      )}
    >
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn(UNASSIGNED_CONFIG.badge, "font-semibold")}>
            {UNASSIGNED_CONFIG.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{stars.length}명</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onBulkRate}>
              <Wallet className="h-4 w-4 mr-2" />
              단가 일괄 설정
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-3 pb-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {stars.length > 0 ? (
            stars.map((star) => (
              <StarCard key={star.id} star={star} fromGradeId="unassigned" />
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center"
            >
              <Users className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">
                모든 STAR가 등급에 배정되었습니다
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- ColorSelector ---

function ColorSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(GRADE_COLOR_PRESETS) as GradeColorKey[]).map((key) => {
        const preset = GRADE_COLOR_PRESETS[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md p-2 transition-all",
              value === key
                ? "ring-2 ring-primary bg-accent"
                : "hover:bg-accent/50"
            )}
          >
            <div className={cn("h-5 w-5 rounded-full", preset.dot)} />
            <span className="text-[10px] text-muted-foreground">
              {preset.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// --- UnassignedRateDialog ---

function UnassignedRateDialog({
  open,
  onOpenChange,
  starsCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starsCount: number;
}) {
  const queryClient = useQueryClient();

  const form = useForm<{ baseRate: number }>({
    defaultValues: {
      baseRate: undefined as unknown as number,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: { baseRate: number }) => {
      const res = await fetch("/api/admin/stars/unassigned-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "오류가 발생했습니다.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.data.count}명의 미배정 STAR 단가가 일괄 설정되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ["admin-grades-board"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>미배정 단가 일괄 설정</DialogTitle>
          <DialogDescription>
            현재 미배정 상태인 STAR {starsCount}명의 단가를 일괄 변경합니다.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="baseRate"
              rules={{ required: "단가를 입력해주세요", min: { value: 0, message: "0 이상이어야 합니다" } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>일괄 단가 (원)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="예: 40000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "반영 중..." : "일괄 적용"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- GradeFormDialog ---

function GradeFormDialog({
  open,
  onOpenChange,
  grade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: Grade | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!grade;

  const form = useForm<GradeFormInput>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      name: grade?.name ?? "",
      baseRate: grade ? Number(grade.baseRate) : (undefined as unknown as number),
      color: grade?.color ?? "amber",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: GradeFormInput) => {
      const url = isEdit
        ? `/api/admin/grades/${grade.id}`
        : "/api/admin/grades";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "오류가 발생했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(isEdit ? "등급이 수정되었습니다." : "등급이 생성되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin-grades-board"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "등급 수정" : "새 등급 추가"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "등급 정보를 수정합니다." : "새로운 등급을 생성합니다."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>등급 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: S등급" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baseRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>단가 (원)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="예: 50000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  {isEdit && grade && grade.users.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      소속 STAR {grade.users.length}명의 단가가 함께 변경됩니다
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>색상</FormLabel>
                  <FormControl>
                    <ColorSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "저장 중..." : isEdit ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- GradeDeleteDialog ---

function GradeDeleteDialog({
  open,
  onOpenChange,
  grade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade: Grade | null;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!grade) return;
      const res = await fetch(`/api/admin/grades/${grade.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "삭제에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("등급이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin-grades-board"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>등급 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            이 등급을 삭제하시겠습니까?
            {grade && grade.users.length > 0 && (
              <> 소속 STAR {grade.users.length}명은 미배정으로 이동합니다.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "삭제 중..." : "삭제"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- BoardSkeleton ---

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={`col-sk-${i}`} className="min-w-[280px] w-[280px] space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[1, 2, 3].map((j) => (
            <Skeleton key={`card-sk-${i}-${j}`} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Main Page ---

export default function AdminStarsPage() {
  const queryClient = useQueryClient();
  const [activeStar, setActiveStar] = useState<{
    star: Star;
    fromGradeId: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkRateOpen, setBulkRateOpen] = useState(false);
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  const [deleteGrade, setDeleteGrade] = useState<Grade | null>(null);

  const { data, isLoading, isError, error } = useQuery<BoardData>({
    queryKey: ["admin-grades-board"],
    queryFn: async () => {
      const res = await fetch("/api/admin/grades");
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          errBody?.error?.message ?? `API 오류 (${res.status})`
        );
      }
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      starId,
      gradeId,
    }: {
      starId: string;
      gradeId: string | null;
    }) => {
      const res = await fetch(`/api/admin/stars/${starId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "등급 변경에 실패했습니다.");
      }
      return res.json();
    },
    onError: () => {
      toast.error("등급 변경에 실패했습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin-grades-board"] });
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { star, fromGradeId } = event.active.data.current as {
      star: Star;
      fromGradeId: string;
    };
    setActiveStar({ star, fromGradeId });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveStar(null);
      const { active, over } = event;
      if (!over || !data) return;

      const fromGradeId = (active.data.current as { fromGradeId: string }).fromGradeId;
      const toGradeId = over.id as string;
      if (fromGradeId === toGradeId) return;

      const star = (active.data.current as { star: Star }).star;
      const targetGradeId = toGradeId === "unassigned" ? null : toGradeId;

      // Optimistic update
      queryClient.setQueryData<BoardData>(["admin-grades-board"], (old) => {
        if (!old) return old;
        const newData = structuredClone(old);

        // Remove from source
        if (fromGradeId === "unassigned") {
          newData.data.unassigned = newData.data.unassigned.filter((s) => s.id !== star.id);
        } else {
          const srcGrade = newData.data.grades.find((g) => g.id === fromGradeId);
          if (srcGrade) srcGrade.users = srcGrade.users.filter((s) => s.id !== star.id);
        }

        // Add to target
        if (toGradeId === "unassigned") {
          newData.data.unassigned.push(star);
        } else {
          const tgtGrade = newData.data.grades.find((g) => g.id === toGradeId);
          if (tgtGrade) {
            tgtGrade.users.push({ ...star, baseRate: Number(tgtGrade.baseRate) });
          }
        }

        return newData;
      });

      // Toast + API call
      const targetGrade = data.data.grades.find((g) => g.id === toGradeId);
      const starName = star.chineseName || star.name;
      const targetName = toGradeId === "unassigned" ? "미배정" : targetGrade?.name ?? "등급";

      assignMutation.mutate(
        { starId: star.id, gradeId: targetGradeId },
        {
          onSuccess: () => {
            if (targetGrade) {
              toast.success(
                `${starName}님이 ${targetName}(으)로 변경되었습니다 (단가: ₩${Number(targetGrade.baseRate).toLocaleString()})`
              );
            } else {
              toast.success(`${starName}님이 미배정으로 변경되었습니다`);
            }
            queryClient.invalidateQueries({ queryKey: ["admin-grades-board"] });
          },
        }
      );
    },
    [data, queryClient, assignMutation]
  );

  const grades = data?.data.grades ?? [];
  const unassigned = data?.data.unassigned ?? [];
  const totalStars = grades.reduce((sum, g) => sum + g.users.length, 0) + unassigned.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">단가 설정</h1>
          <p className="text-sm text-muted-foreground">
            STAR를 등급으로 드래그하여 단가를 관리하세요. ({totalStars}명)
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          등급 추가
        </Button>
      </div>

      {data?._debug && data._debug.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">DB 쿼리 디버그:</p>
          {data._debug.map((msg, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-500 font-mono">{msg}</p>
          ))}
        </div>
      )}

      {isLoading ? (
        <BoardSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive font-medium">
            데이터를 불러오지 못했습니다: {error?.message}
          </p>
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex overflow-x-auto gap-4 pb-4">
            <UnassignedColumn stars={unassigned} onBulkRate={() => setBulkRateOpen(true)} />
            {grades.map((grade) => (
              <GradeColumn
                key={grade.id}
                grade={grade}
                onEdit={(g) => setEditGrade(g)}
                onDelete={(g) => setDeleteGrade(g)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeStar ? (
              <StarCard
                star={activeStar.star}
                fromGradeId={activeStar.fromGradeId}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <GradeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <GradeFormDialog
        key={editGrade?.id ?? "edit"}
        open={!!editGrade}
        onOpenChange={(open) => !open && setEditGrade(null)}
        grade={editGrade}
      />
      <GradeDeleteDialog
        open={!!deleteGrade}
        onOpenChange={(open) => !open && setDeleteGrade(null)}
        grade={deleteGrade}
      />
      <UnassignedRateDialog
        open={bulkRateOpen}
        onOpenChange={setBulkRateOpen}
        starsCount={unassigned.length}
      />
    </div>
  );
}

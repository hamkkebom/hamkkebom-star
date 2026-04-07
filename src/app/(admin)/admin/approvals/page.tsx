"use client";

import { useMemo, useState, useCallback, memo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Clock,
  UserCheck,
  UserX,
  Inbox,
  CalendarDays,
  Users,
  Search,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────

type PendingStar = {
  id: string;
  name: string;
  chineseName: string | null;
  email: string;
  avatarUrl: string | null;
};

type PendingRequest = {
  id: string;
  title: string;
  deadline: string;
  maxAssignees: number;
  categories: string[];
  status: string;
  _count: {
    assignments: number;
  };
};

type PendingAssignment = {
  id: string;
  createdAt: string;
  star: PendingStar;
  request: PendingRequest;
};

type PendingResponse = {
  data: PendingAssignment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getInitials(name: string) {
  return name.charAt(0).toUpperCase();
}

function getDisplayName(star: PendingStar) {
  return star.chineseName || star.name;
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error?.message ?? "요청 처리에 실패했습니다.";
  } catch {
    return "요청 처리에 실패했습니다.";
  }
}

function groupByRequest(assignments: PendingAssignment[]) {
  const groups = new Map<
    string,
    { request: PendingRequest; assignments: PendingAssignment[] }
  >();

  for (const assignment of assignments) {
    const key = assignment.request.id;
    const existing = groups.get(key);
    if (existing) {
      existing.assignments.push(assignment);
    } else {
      groups.set(key, {
        request: assignment.request,
        assignments: [assignment],
      });
    }
  }

  return Array.from(groups.values());
}

// ─── Data fetching ───────────────────────────────────────────

async function fetchPendingAssignments() {
  const response = await fetch("/api/projects/assignments/pending?pageSize=50", {
    cache: "no-store",
  });
  const payload = (await response.json()) as PendingResponse | ApiError;

  if (!response.ok) {
    const message =
      "error" in payload
        ? (payload as ApiError).error.message
        : "승인 대기 목록을 불러오지 못했습니다.";
    throw new Error(message);
  }

  return payload as PendingResponse;
}

// ─── Sub-Components ──────────────────────────────────────────

function AssignmentSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={`sk-group-${group}`} className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((card) => (
              <Skeleton key={`sk-card-${group}-${card}`} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        대기 중인 승인 요청이 없습니다
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        STAR가 프로젝트에 참여 신청하면 이곳에 표시됩니다.
      </p>
    </div>
  );
}

// ─── Star Assignment Card ────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const AssignmentCard = memo(function AssignmentCard({
  assignment,
  index,
  isHiding,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  assignment: PendingAssignment;
  index: number;
  isHiding: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const star = assignment.star;
  const displayName = getDisplayName(star);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30",
          isHiding && "opacity-0 scale-95 pointer-events-none",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {star.avatarUrl && <AvatarImage src={star.avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-foreground text-sm font-bold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{star.email}</p>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{formatDate(assignment.createdAt)} 신청</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onApprove(assignment.id)}
              disabled={isApproving || isRejecting || isHiding}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {isApproving ? "처리 중..." : "승인"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onReject(assignment.id)}
              disabled={isApproving || isRejecting || isHiding}
            >
              <UserX className="h-3.5 w-3.5" />
              거절
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// ─── Group Section ───────────────────────────────────────────

function GroupSection({
  group,
  hidingIds,
  onApprove,
  onReject,
  approveMutation,
  rejectMutation,
}: {
  group: { request: PendingRequest; assignments: PendingAssignment[] };
  hidingIds: Set<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approveMutation: { isPending: boolean; variables: string | undefined };
  rejectMutation: { isPending: boolean; variables: { id: string } | undefined };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pct = group.request.maxAssignees > 0
    ? Math.min(100, Math.round((group.request._count.assignments / group.request.maxAssignees) * 100))
    : 0;
  const isExpired = new Date(group.request.deadline) < new Date();

  return (
    <section className="space-y-3">
      {/* Project Group Header */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1.5 group cursor-pointer"
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 90 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
        <h2 className="text-base font-semibold truncate max-w-md group-hover:text-primary transition-colors">
          {group.request.title}
        </h2>
        <div className="flex items-center gap-2">
          {isExpired && (
            <Badge variant="destructive" className="gap-1 text-xs">
              ⏰ 마감 경과
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-xs">
            <Users className="h-3 w-3" />
            {group.request._count.assignments}/{group.request.maxAssignees}
          </Badge>
          <Badge variant="outline" className={cn("gap-1 text-xs", isExpired && "text-destructive border-destructive/50")}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(group.request.deadline)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {group.assignments.length}명 대기
          </Badge>
          {group.request.categories.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {group.request.categories.slice(0, 3).map((cat) => (
                <Badge key={cat} variant="secondary" className="text-[10px] px-1.5">
                  {cat}
                </Badge>
              ))}
              {group.request.categories.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{group.request.categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tiny progress bar */}
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
        </div>
      </button>

      {/* Star Cards Grid */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
              {group.assignments.map((assignment, i) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  index={i}
                  isHiding={hidingIds.has(assignment.id)}
                  onApprove={onApprove}
                  onReject={onReject}
                  isApproving={
                    approveMutation.isPending &&
                    approveMutation.variables === assignment.id
                  }
                  isRejecting={
                    rejectMutation.isPending &&
                    rejectMutation.variables?.id === assignment.id
                  }
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Reject Dialog ───────────────────────────────────────────

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = useCallback(() => {
    onConfirm(reason);
  }, [reason, onConfirm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setReason("");
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title="프로젝트 참여 거절"
      className="sm:max-w-md"
    >
      <div className="space-y-3 py-2">
        <Textarea
          placeholder="거절 사유를 입력하세요 (선택)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {reason.length}/500
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="ghost"
          onClick={() => handleOpenChange(false)}
          disabled={isPending}
        >
          취소
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? "처리 중..." : "거절"}
        </Button>
      </div>
    </ResponsiveModal>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function AdminApprovalsPage() {
  const queryClient = useQueryClient();

  // Optimistic hide state
  const [hidingIds, setHidingIds] = useState<Set<string>>(new Set());

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  // Search state with 350ms debounce
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pending-assignments"],
    queryFn: fetchPendingAssignments,
  });

  // Debounce
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  // ─── Approve mutation ──────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/projects/assignments/${id}/approve`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      return response.json();
    },
    onMutate: (id: string) => {
      setHidingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: async (_data, id) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      toast.success("승인되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["pending-assignments"] });
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (err, id) => {
      toast.error(err instanceof Error ? err.message : "승인 처리에 실패했습니다.");
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // ─── Reject mutation ───────────────────────────────────

  const rejectMutation = useMutation({
    mutationFn: async ({
      id,
      rejectionReason,
    }: {
      id: string;
      rejectionReason?: string;
    }) => {
      const response = await fetch(
        `/api/projects/assignments/${id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rejectionReason: rejectionReason || undefined,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      return response.json();
    },
    onMutate: ({ id }) => {
      setHidingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: async (_data, { id }) => {
      setRejectTarget(null);
      await new Promise((resolve) => setTimeout(resolve, 350));
      toast.success("거절되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["pending-assignments"] });
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (err, { id }) => {
      toast.error(err instanceof Error ? err.message : "거절 처리에 실패했습니다.");
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const handleApprove = useCallback(
    (id: string) => {
      approveMutation.mutate(id);
    },
    [approveMutation],
  );

  const handleRejectOpen = useCallback((id: string) => {
    setRejectTarget(id);
  }, []);

  const handleRejectConfirm = useCallback(
    (reason: string) => {
      if (!rejectTarget) return;
      rejectMutation.mutate({
        id: rejectTarget,
        rejectionReason: reason || undefined,
      });
    },
    [rejectTarget, rejectMutation],
  );

  // Group and filter
  const assignments = useMemo(() => data?.data ?? [], [data?.data]);

  const groups = useMemo(() => {
    const allGroups = groupByRequest(assignments);
    if (!debouncedSearch.trim()) return allGroups;

    const lowerSearch = debouncedSearch.toLowerCase();
    return allGroups.filter((group) => {
      const titleMatches = group.request.title.toLowerCase().includes(lowerSearch);
      if (titleMatches) return true;
      return group.assignments.some((assignment) => {
        const displayName = getDisplayName(assignment.star).toLowerCase();
        return displayName.includes(lowerSearch);
      });
    });
  }, [assignments, debouncedSearch]);

  const totalCount = data?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">승인 대기 목록</h1>
            <p className="text-sm text-muted-foreground">
              STAR의 프로젝트 참여 신청을 승인하거나 거절합니다.
            </p>
          </div>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {totalCount}건 대기중
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="mt-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="STAR 이름 또는 프로젝트 제목으로 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <AssignmentSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "승인 대기 목록을 불러오지 못했습니다."}
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState />
      ) : groups.length === 0 && debouncedSearch.trim() ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            검색 결과가 없습니다
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            다른 검색어를 시도해보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <GroupSection
              key={group.request.id}
              group={group}
              hidingIds={hidingIds}
              onApprove={handleApprove}
              onReject={handleRejectOpen}
              approveMutation={{
                isPending: approveMutation.isPending,
                variables: approveMutation.variables,
              }}
              rejectMutation={{
                isPending: rejectMutation.isPending,
                variables: rejectMutation.variables,
              }}
            />
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        onConfirm={handleRejectConfirm}
        isPending={rejectMutation.isPending}
      />
    </div>
  );
}

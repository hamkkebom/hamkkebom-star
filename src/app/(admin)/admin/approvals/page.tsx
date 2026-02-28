"use client";

import { useMemo, useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Clock,
  UserCheck,
  UserX,
  Inbox,
  CalendarDays,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

// --- Types ---

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

// --- Helpers ---

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

// --- Data fetching ---

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

// --- Skeleton ---

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
              <Card key={`sk-card-${group}-${card}`} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Empty State ---

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

// --- Star Assignment Card ---

const AssignmentCard = memo(function AssignmentCard({
  assignment,
  isHiding,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  assignment: PendingAssignment;
  isHiding: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const star = assignment.star;
  const displayName = getDisplayName(star);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 will-change-transform hover:shadow-md hover:-translate-y-0.5",
        isHiding && "transition-all duration-300 opacity-0 scale-95 pointer-events-none",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {star.avatarUrl && <AvatarImage src={star.avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-sm font-bold">
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
  );
});

// --- Reject Dialog ---

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로젝트 참여 거절</DialogTitle>
        </DialogHeader>
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
        <DialogFooter className="gap-2 sm:gap-0">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export default function AdminApprovalsPage() {
  const queryClient = useQueryClient();

  // Optimistic hide state: set of assignment IDs being hidden
  const [hidingIds, setHidingIds] = useState<Set<string>>(new Set());

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pending-assignments"],
    queryFn: fetchPendingAssignments,
  });

  // --- Approve mutation ---
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
      // Wait for fade-out animation
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

  // --- Reject mutation ---
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

  // Group assignments by request
  const assignments = useMemo(() => data?.data ?? [], [data?.data]);
  const groups = useMemo(() => groupByRequest(assignments), [assignments]);
  const totalCount = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">승인 대기 목록</h1>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalCount}건
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          STAR의 프로젝트 참여 신청을 승인하거나 거절할 수 있습니다.
        </p>
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
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.request.id} className="space-y-3">
              {/* Project Group Header */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-base font-semibold truncate max-w-md">
                  {group.request.title}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Users className="h-3 w-3" />
                    {group.request._count.assignments}/{group.request.maxAssignees}명 승인됨
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(group.request.deadline)}
                  </Badge>
                  {group.request.categories.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1">
                      {group.request.categories.slice(0, 3).map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-[10px] px-1.5"
                        >
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
              </div>

              {/* Star Cards Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.assignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    isHiding={hidingIds.has(assignment.id)}
                    onApprove={handleApprove}
                    onReject={handleRejectOpen}
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
            </section>
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

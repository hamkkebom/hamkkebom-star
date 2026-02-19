"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestForm } from "@/components/project/request-form";
import type { CreateRequestInput } from "@/lib/validations/project-request";

type RequestStatus = "OPEN" | "FULL" | "CLOSED" | "CANCELLED";
type AssignmentType = "SINGLE" | "MULTIPLE";

type AdminRequestRow = {
  id: string;
  title: string;
  categories: string[];
  deadline: string;
  assignmentType: AssignmentType;
  maxAssignees: number;
  estimatedBudget: string | number | null;
  requirements: string | null;
  referenceUrls: string[];
  status: RequestStatus;
  currentAssignees: number;
};

type RequestBoardResponse = {
  data: AdminRequestRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

const statusLabel: Record<RequestStatus, string> = {
  OPEN: "모집중",
  FULL: "정원마감",
  CLOSED: "종료",
  CANCELLED: "취소",
};

const assignmentTypeLabel: Record<AssignmentType, string> = {
  SINGLE: "단일",
  MULTIPLE: "다중",
};

async function fetchAdminRequests() {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  const response = await fetch(`/api/projects/requests/board?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as RequestBoardResponse | ApiError;

  if (!response.ok) {
    const message = "error" in payload ? payload.error.message : "요청 목록을 불러오지 못했습니다.";
    throw new Error(message);
  }

  return payload as RequestBoardResponse;
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error?.message ?? "요청 처리에 실패했습니다.";
  } catch {
    return "요청 처리에 실패했습니다.";
  }
}

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function AdminRequestsPanel() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<AdminRequestRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-project-requests"],
    queryFn: fetchAdminRequests,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateRequestInput) => {
      const response = await fetch("/api/projects/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("요청이 생성되었습니다.");
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "요청 생성에 실패했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateRequestInput }) => {
      const response = await fetch(`/api/projects/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("요청이 수정되었습니다.");
      setEditingRequest(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "요청 수정에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/requests/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("요청이 삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "요청 삭제에 실패했습니다.");
    },
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">프로젝트 관리</h1>
          <p className="text-sm text-muted-foreground">요청을 생성하고 상태를 관리할 수 있습니다.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>프로젝트 생성</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>새 프로젝트 생성</DialogTitle>
              <DialogDescription>필수 정보를 입력한 뒤 요청을 생성하세요.</DialogDescription>
            </DialogHeader>
            <RequestForm
              submitLabel="요청 생성"
              onSubmit={async (payload) => {
                await createMutation.mutateAsync(payload);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "요청 목록을 불러오지 못했습니다."}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>할당</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead>수락 인원</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    등록된 요청이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[320px] truncate font-medium">{row.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel[row.status]}</Badge>
                    </TableCell>
                    <TableCell>{assignmentTypeLabel[row.assignmentType]}</TableCell>
                    <TableCell>{formatDate(row.deadline)}</TableCell>
                    <TableCell>
                      {row.currentAssignees}/{row.maxAssignees}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingRequest(row)}>
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            const confirmed = window.confirm("정말 이 요청을 삭제하시겠습니까?");
                            if (!confirmed) {
                              return;
                            }

                            await deleteMutation.mutateAsync(row.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(editingRequest)} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>요청 수정</DialogTitle>
            <DialogDescription>내용을 수정한 뒤 저장하세요.</DialogDescription>
          </DialogHeader>
          {editingRequest ? (
            <RequestForm
              submitLabel="변경사항 저장"
              initialValues={{
                title: editingRequest.title,
                categories: editingRequest.categories,
                deadline: editingRequest.deadline,
                assignmentType: editingRequest.assignmentType,
                maxAssignees: editingRequest.maxAssignees,
                estimatedBudget:
                  editingRequest.estimatedBudget === null
                    ? undefined
                    : Number(editingRequest.estimatedBudget),
                requirements: editingRequest.requirements ?? undefined,
                referenceUrls: editingRequest.referenceUrls,
              }}
              onSubmit={async (payload) => {
                await updateMutation.mutateAsync({ id: editingRequest.id, payload });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

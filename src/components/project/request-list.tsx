"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestCard, type RequestCardItem } from "@/components/project/request-card";

type RequestBoardResponse = {
  data: RequestCardItem[];
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

async function fetchRequestBoard(status: string, search: string) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "12",
  });

  if (status && status !== "ALL") {
    params.set("status", status);
  }

  if (search) {
    params.set("search", search);
  }

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

function RequestCardSkeleton() {
  return (
    <div className="rounded-xl border p-6">
      <Skeleton className="mb-4 h-6 w-2/3" />
      <Skeleton className="mb-5 h-4 w-1/3" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="mb-3 h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function RequestList({ status, search }: { status: string; search: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["project-requests-board", status, search],
    queryFn: () => fetchRequestBoard(status, search),
  });

  if (isLoading) {
    const skeletonKeys = ["one", "two", "three", "four", "five", "six"];

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skeletonKeys.map((key) => (
          <RequestCardSkeleton key={`request-card-skeleton-${key}`} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "요청 목록을 불러오지 못했습니다."}
      </div>
    );
  }

  if (!data?.data.length) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-14 text-center">
        <h3 className="mb-1 text-lg font-semibold">요청이 없습니다</h3>
        <p className="text-sm text-muted-foreground">필터를 변경하거나 검색어를 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.data.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}

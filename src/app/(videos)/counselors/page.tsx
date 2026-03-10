"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function CounselorsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["counselors", { search: debouncedSearch, category, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "12",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (category) params.append("category", category);

      const res = await fetch(`/api/counselors?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch counselors");
      return res.json();
    },
  });

  const categories = ["전체", "심리상담", "진로상담", "연애상담", "가족상담", "기타"];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">파트너 전문가</h1>
        <p className="mt-2 text-muted-foreground">함께봄의 전문 상담사와 함께 만드는 영상</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="전문가 이름, 해시태그, 전문 분야 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={category === (cat === "전체" ? "" : cat) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCategory(cat === "전체" ? "" : cat);
                setPage(1);
              }}
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="오류 발생"
          description="전문가 목록을 불러오는 중 오류가 발생했습니다."
        />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          title="검색 결과 없음"
          description="조건에 맞는 전문가를 찾을 수 없습니다."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data?.data?.map((counselor: any) => (
              <Link
                key={counselor.id}
                href={`/counselors/${counselor.id}`}
                className="group flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                <div className="flex items-start justify-between">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                    <AvatarImage src={counselor.imageUrl || ""} alt={counselor.displayName} />
                    <AvatarFallback>{counselor.displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  {counselor.category && (
                    <Badge variant="secondary" className="shrink-0">
                      {counselor.category}
                    </Badge>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {counselor.displayName}
                  </h3>
                  {counselor.specialties && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {counselor.specialties}
                    </p>
                  )}
                </div>

                {counselor.hashtags && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    {counselor.hashtags.split(",").slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="flex h-5 items-center rounded-full bg-primary/10 px-2">
                    영상 {counselor._count?.videos || 0}개
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {data?.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

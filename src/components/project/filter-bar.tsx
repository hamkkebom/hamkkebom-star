"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "OPEN", label: "모집중" },
  { value: "FULL", label: "정원마감" },
  { value: "CLOSED", label: "종료" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "ALL";
  const searchFromUrl = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(searchFromUrl);

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  const updateParams = useCallback(
    (nextStatus: string, nextSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!nextStatus || nextStatus === "ALL") {
        params.delete("status");
      } else {
        params.set("status", nextStatus);
      }

      if (!nextSearch.trim()) {
        params.delete("search");
      } else {
        params.set("search", nextSearch.trim());
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    // 현재 URL 파라미터와 동일하면 router.replace를 skip하여 RSC 무한 루프 방지
    if (searchInput === searchFromUrl) return;

    const timeoutId = window.setTimeout(() => {
      updateParams(status, searchInput);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, status, searchFromUrl, updateParams]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center">
      <div className="w-full md:w-44">
        <Select value={status} onValueChange={(value) => updateParams(value, searchInput)}>
          <SelectTrigger>
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="요청 제목 또는 요구사항 검색"
      />
    </div>
  );
}

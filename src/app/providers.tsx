"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

function AuthInitializer({ children }: { children: ReactNode }) {
  useAuth();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,         // 30초 — 적절한 freshness 유지
            gcTime: 10 * 60 * 1000,      // 10분
            retry: 1,
            refetchOnWindowFocus: true,   // 탭 복귀 시 stale 데이터 자동 갱신
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>{children}</AuthInitializer>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

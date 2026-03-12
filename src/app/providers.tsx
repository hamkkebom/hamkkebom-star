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
            staleTime: 5 * 60 * 1000,   // 5분 — 동일 데이터 반복 fetch 방지
            gcTime: 10 * 60 * 1000,      // 10분
            retry: 1,
            refetchOnWindowFocus: false,  // 탭 전환 시 불필요한 refetch 방지
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

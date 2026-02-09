"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

interface StarBadge {
  unreadFeedbacks: number;
}

interface AdminBadge {
  unreviewedSubmissions: number;
  pendingSettlements: number;
}

export type NotificationBadge = StarBadge | AdminBadge;

function isAdminBadge(badge: NotificationBadge): badge is AdminBadge {
  return "unreviewedSubmissions" in badge;
}

async function fetchBadge(): Promise<NotificationBadge | null> {
  const response = await fetch("/api/notifications/badge", {
    cache: "no-store",
  });

  if (!response.ok) return null;

  const json = (await response.json()) as { data: NotificationBadge };
  return json.data;
}

/**
 * 알림 뱃지 카운트 폴링 (60초 간격).
 * 역할에 따라 STAR(unreadFeedbacks) 또는 ADMIN(unreviewedSubmissions + pendingSettlements) 반환.
 */
export function useNotifications() {
  const user = useAuthStore((s) => s.user);

  const { data: badge } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: fetchBadge,
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const totalCount = badge
    ? isAdminBadge(badge)
      ? badge.unreviewedSubmissions + badge.pendingSettlements
      : badge.unreadFeedbacks
    : 0;

  return { badge, totalCount, isAdminBadge: badge ? isAdminBadge(badge) : false };
}

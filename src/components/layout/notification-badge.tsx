"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, FileVideo, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type BadgeData = {
  unreadFeedbacks?: number;
  unreviewedSubmissions?: number;
  pendingSettlements?: number;
};

type NotificationItem = {
  id: string;
  type: "feedback" | "submission" | "settlement";
  title: string;
  description: string;
  createdAt: string;
  link: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

const typeIcons = {
  feedback: MessageSquare,
  submission: FileVideo,
  settlement: DollarSign,
};

const typeColors = {
  feedback: "text-blue-500",
  submission: "text-orange-500",
  settlement: "text-green-500",
};

export function NotificationBadge() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Badge count
  const { data: badge } = useQuery({
    queryKey: ["notification-badge"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/badge", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: BadgeData };
      return json.data;
    },
    refetchInterval: 30000, // 30초마다 갱신
  });

  // Notification list (popover 열릴 때만)
  const { data: notifications } = useQuery({
    queryKey: ["notification-list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return [];
      const json = (await res.json()) as { data: NotificationItem[] };
      return json.data;
    },
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const totalCount = badge
    ? (badge.unreadFeedbacks ?? 0) +
    (badge.unreviewedSubmissions ?? 0) +
    (badge.pendingSettlements ?? 0)
    : 0;

  function handleClickItem(link: string) {
    setOpen(false);
    router.push(link);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">알림</h3>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground">{totalCount}개의 새 알림</p>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">새 알림이 없습니다</p>
            </div>
          ) : (
            notifications.map((item) => {
              const Icon = typeIcons[item.type];
              const color = typeColors[item.type];
              return (
                <div
                  key={item.id}
                  onClick={() => handleClickItem(item.link)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClickItem(item.link);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 cursor-pointer focus:outline-none focus:bg-muted/50"
                >
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

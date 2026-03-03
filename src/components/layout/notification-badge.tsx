"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, FileVideo, DollarSign, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

type NotificationType = "feedback" | "submission" | "settlement" | "assignment";

type NotificationItem = {
  id: string;
  type: NotificationType;
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
  assignment: UserCheck,
};

const typeColors = {
  feedback: "text-blue-500",
  submission: "text-orange-500",
  settlement: "text-green-500",
  assignment: "text-violet-500",
};

const typeBgColors = {
  feedback: "bg-blue-500/10 dark:bg-blue-500/20",
  submission: "bg-orange-500/10 dark:bg-orange-500/20",
  settlement: "bg-green-500/10 dark:bg-green-500/20",
  assignment: "bg-violet-500/10 dark:bg-violet-500/20",
};

const typeLabels = {
  feedback: "피드백",
  submission: "제출물",
  settlement: "정산",
  assignment: "지원",
};

export function NotificationBadge() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Badge count from hook
  const { totalCount } = useNotifications();

  // Notification list (popover 열릴 때만)
  const { data: notifications } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return [];
      const json = (await res.json()) as { data: NotificationItem[] };
      return json.data;
    },
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  function handleClickItem(link: string) {
    setOpen(false);
    router.push(link);
  }

  const groupedNotifications = useMemo(() => {
    if (!notifications) return {} as Partial<Record<NotificationType, NotificationItem[]>>;
    return notifications.reduce<Partial<Record<NotificationType, NotificationItem[]>>>((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type]!.push(item);
      return acc;
    }, {});
  }, [notifications]);

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent/50 transition-colors">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground animate-scale-in">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 overflow-hidden border-border/50 shadow-2xl shadow-primary/5 dark:shadow-primary/10">
        <div className="relative border-b border-border/50 bg-muted/30 px-4 py-3 backdrop-blur-sm">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">알림</h3>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {totalCount}개의 새 알림
              </span>
            )}
          </div>
        </div>
        
        <div className="max-h-[22rem] overflow-y-auto scrollbar-pretty p-2">
          {!hasNotifications ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <div className="rounded-full bg-muted/50 p-4 mb-3">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">새 알림이 없습니다</p>
              <p className="text-xs text-muted-foreground/60 mt-1">모든 알림을 확인했습니다</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {(Object.keys(groupedNotifications) as NotificationType[]).map((type, groupIndex) => {
                const items = groupedNotifications[type];
                if (!items || items.length === 0) return null;
                
                return (
                  <div key={type} className="space-y-1 animate-slide-up" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                    <div className="px-2 pb-1">
                      <h4 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                        {typeLabels[type]}
                      </h4>
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const Icon = typeIcons[item.type];
                        const color = typeColors[item.type];
                        const bgColor = typeBgColors[item.type];
                        
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
                            className="group flex w-full items-start gap-3 rounded-lg p-2 text-left transition-all duration-200 hover:bg-accent/50 focus:outline-none focus:bg-accent/50 cursor-pointer"
                          >
                            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors", bgColor, color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                                  {item.title}
                                </p>
                                <span className="shrink-0 text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                  {timeAgo(item.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

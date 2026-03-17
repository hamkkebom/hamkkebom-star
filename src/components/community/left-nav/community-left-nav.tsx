"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  HelpCircle, 
  Lightbulb, 
  Camera, 
  Users, 
  Megaphone, 
  Globe,
  PenSquare,
  Bookmark,
  Heart
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

const BOARDS = [
  { id: "", label: "전체 게시글", icon: Globe },
  { id: "FREE", label: "자유 게시판", icon: MessageSquare },
  { id: "QNA", label: "Q&A", icon: HelpCircle },
  { id: "TIPS", label: "제작 팁", icon: Lightbulb },
  { id: "SHOWCASE", label: "작품 자랑", icon: Camera },
  { id: "RECRUITMENT", label: "협업 모집", icon: Users },
  { id: "NOTICE", label: "공지사항", icon: Megaphone },
];

export function CommunityLeftNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBoardType = searchParams.get("boardType") || "";
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          게시판
        </h3>
        {BOARDS.map((board) => {
          const isActive = currentBoardType === board.id || (board.id === "" && currentBoardType === null);
          const Icon = board.icon;
          const href = board.id ? `/community?boardType=${board.id}` : "/community";
          
          return (
            <Link
              key={board.id}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground/70")} />
              {board.label}
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="space-y-1 border-t border-border pt-6">
          <h3 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            내 활동
          </h3>
          <Link
            href="/stars/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <PenSquare className="w-4 h-4 text-muted-foreground/70" />
            내가 쓴 글
          </Link>
          <Link
            href="/stars/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Bookmark className="w-4 h-4 text-muted-foreground/70" />
            북마크
          </Link>
          <Link
            href="/stars/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Heart className="w-4 h-4 text-muted-foreground/70" />
            좋아요한 글
          </Link>
        </div>
      )}
    </div>
  );
}

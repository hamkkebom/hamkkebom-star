"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";

interface BestComment {
  id: string;
  content: string;
  likeCount: number;
  author: { name: string; avatarUrl: string | null };
  post: { id: string; title: string };
}

export function BestCommentsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-best-comments"],
    queryFn: async () => {
      const res = await fetch("/api/board/best-comments");
      if (!res.ok) throw new Error("Failed to fetch best comments");
      return res.json() as Promise<{ data: BestComment[] }>;
    },
    staleTime: 30 * 60 * 1000, // 30 mins
  });

  return (
    <SidebarWidget
      title="TODAY 베스트 댓글"
      icon={<MessageCircle className="w-4 h-4 text-sky-500 fill-sky-500/20" />}
    >
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((comment) => (
            <div key={comment.id} className="group relative flex gap-3 p-2 -mx-2 rounded-xl hover:bg-muted/50 transition-colors">
              
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
                  <Image
                    src={comment.author.avatarUrl || "/placeholder-avatar.png"}
                    alt={comment.author.name}
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground/80">
                    {comment.author.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                    <Heart className="w-2.5 h-2.5 fill-pink-500" /> {comment.likeCount}
                  </span>
                </div>
                
                <Link 
                  href={`/community/post/${comment.post.id}`}
                  className="block text-[13px] text-foreground leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors"
                >
                  {comment.content}
                </Link>
                
                <Link 
                  href={`/community/post/${comment.post.id}`}
                  className="inline-flex text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md line-clamp-1 hover:text-foreground transition-colors"
                >
                  ↳ 원문: {comment.post.title}
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-center text-muted-foreground py-4">
            오늘 등록된 베스트 댓글이 없습니다.
          </div>
        )}
      </div>
    </SidebarWidget>
  );
}

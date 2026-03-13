"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, Film, Music, Tv, Monitor, Camera, Gamepad, Briefcase, Heart, Star, Sparkles, Zap, Flame, Coffee, Compass, Map, Book, PenTool } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count?: { videos: number };
};

const iconMap: Record<string, React.ElementType> = {
  film: Film,
  music: Music,
  tv: Tv,
  monitor: Monitor,
  camera: Camera,
  gamepad: Gamepad,
  briefcase: Briefcase,
  heart: Heart,
  star: Star,
  sparkles: Sparkles,
  zap: Zap,
  flame: Flame,
  coffee: Coffee,
  compass: Compass,
  map: Map,
  book: Book,
  pentool: PenTool,
};

const gradients = [
  "from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 hover:border-violet-500/50",
  "from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/50",
  "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-500/50",
  "from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-500/50",
  "from-pink-500/20 to-rose-500/20 border-pink-500/30 hover:border-pink-500/50",
  "from-indigo-500/20 to-blue-500/20 border-indigo-500/30 hover:border-indigo-500/50",
  "from-lime-500/20 to-green-500/20 border-lime-500/30 hover:border-lime-500/50",
  "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30 hover:border-fuchsia-500/50",
];

export function CategoryShowcase() {
  const { data, isLoading } = useQuery<{ data: Category[] }>({
    queryKey: ["categories-showcase"],
    queryFn: () => fetch("/api/categories").then((res) => res.json()),
  });

  const categories = data?.data?.slice(0, 8) || [];

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            다양한 분야의 영상
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            원하는 카테고리의 영상을 찾아보세요
          </p>
        </div>
        <Link
          href="/categories"
          className="hidden md:flex items-center text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
        >
          전체 카테고리 보기 <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-4 pb-4 md:pb-0 snap-x hide-scrollbar">
          {categories.map((category, index) => {
            const Icon = category.icon && iconMap[category.icon.toLowerCase()] ? iconMap[category.icon.toLowerCase()] : Film;
            const gradientClass = gradients[index % gradients.length];

            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className={`min-w-[160px] md:min-w-0 snap-start group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${gradientClass}`}
              >
                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-white/50 dark:bg-black/20 p-3 backdrop-blur-sm">
                      <Icon className="h-6 w-6 text-foreground/70" />
                    </div>
                    {category._count?.videos !== undefined && (
                      <span className="rounded-full bg-white/50 dark:bg-black/20 px-2.5 py-1 text-xs font-medium text-foreground/70 backdrop-blur-sm">
                        {category._count.videos}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-violet-600 transition-colors">
                      {category.name}
                    </h3>
                  </div>
                </div>
                
                {/* Decorative background icon */}
                <Icon className="absolute -bottom-4 -right-4 h-24 w-24 text-foreground/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" />
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-center md:hidden">
        <Link
          href="/categories"
          className="flex items-center text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
        >
          전체 카테고리 보기 <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

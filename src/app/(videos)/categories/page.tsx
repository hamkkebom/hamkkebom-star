import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlayCircle, Heart, Star, Compass, BookOpen, Users, Sparkles, Video, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const iconMap: Record<string, LucideIcon> = {
  "play-circle": PlayCircle,
  "heart": Heart,
  "star": Star,
  "compass": Compass,
  "book-open": BookOpen,
  "users": Users,
  "sparkles": Sparkles,
  "video": Video,
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          videos: {
            where: {
              status: { in: ["APPROVED", "FINAL"] },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">영상 카테고리</h1>
        <p className="mt-3 text-muted-foreground">다양한 주제의 영상을 카테고리별로 만나보세요</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => {
          const Icon = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Video;
          
          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-8 w-8" />
                </div>
                
                <div>
                  <h3 className="font-bold text-lg">{category.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    영상 {category._count.videos}개
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User, Globe, PlayCircle, Eye, ExternalLink,
    Film, Calendar, Copy, CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type PortfolioData = {
    user: {
        id: string;
        name: string;
        chineseName: string | null;
        avatarUrl: string | null;
    };
    portfolio: {
        bio: string | null;
        showreel: string | null;
        website: string | null;
        socialLinks: Record<string, string> | null;
        items: Array<{
            id: string;
            title: string;
            description: string | null;
            thumbnailUrl: string | null;
            videoUrl: string | null;
        }>;
    } | null;
    videos: Array<{
        id: string;
        title: string;
        description: string | null;
        thumbnailUrl: string | null;
        viewCount: number;
        createdAt: string;
    }>;
};

export default function PublicPortfolioPage() {
    const params = useParams();
    const userId = params.userId as string;
    const [copied, setCopied] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["public-portfolio", userId],
        queryFn: async () => {
            const res = await fetch(`/api/portfolio/${userId}`);
            if (!res.ok) throw new Error("포트폴리오를 찾을 수 없습니다.");
            return (await res.json()) as { data: PortfolioData };
        },
    });

    function handleCopyLink() {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
                <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="max-w-lg mx-auto px-4 py-24 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <User className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h1 className="text-xl font-bold mb-2">포트폴리오를 찾을 수 없습니다</h1>
                <p className="text-sm text-muted-foreground">존재하지 않는 크리에이터이거나 비공개 상태입니다.</p>
            </div>
        );
    }

    const { user, portfolio, videos } = data.data;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 pb-20">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                {user.avatarUrl ? (
                    <Image
                        src={user.avatarUrl}
                        alt={user.name}
                        width={96}
                        height={96}
                        className="rounded-full mx-auto ring-4 ring-violet-500/20"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 mx-auto flex items-center justify-center text-white text-3xl font-bold">
                        {user.name.charAt(0)}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold">
                        {user.name}
                        {user.chineseName && (
                            <span className="text-muted-foreground font-normal text-lg ml-2">({user.chineseName})</span>
                        )}
                    </h1>
                    {portfolio?.bio && (
                        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{portfolio.bio}</p>
                    )}
                </div>

                <div className="flex justify-center gap-3">
                    {portfolio?.website && (
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                            <a href={portfolio.website} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-3.5 h-3.5" />
                                웹사이트
                            </a>
                        </Button>
                    )}
                    {portfolio?.showreel && (
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                            <a href={portfolio.showreel} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="w-3.5 h-3.5" />
                                쇼릴
                            </a>
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "복사됨!" : "링크 복사"}
                    </Button>
                </div>
            </motion.div>

            {/* Portfolio Items */}
            {portfolio?.items && portfolio.items.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Film className="w-5 h-5 text-violet-500" />
                        포트폴리오
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {portfolio.items.map((item) => (
                            <Card key={item.id} className="overflow-hidden group">
                                {item.thumbnailUrl && (
                                    <div className="relative aspect-video bg-muted">
                                        <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                                    {item.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                    )}
                                    {item.videoUrl && (
                                        <a
                                            href={item.videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-violet-500 mt-2 hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            영상 보기
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Approved Videos */}
            {videos.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-emerald-500" />
                        승인된 영상
                        <Badge variant="secondary">{videos.length}건</Badge>
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {videos.map((video) => (
                            <Card key={video.id} className="overflow-hidden">
                                {video.thumbnailUrl && (
                                    <div className="relative aspect-video bg-muted">
                                        <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-sm line-clamp-1 mb-1">{video.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            {video.viewCount.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(video.createdAt).toLocaleDateString("ko-KR")}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

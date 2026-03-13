import { Skeleton } from "@/components/ui/skeleton";

export function MobileReviewSkeleton({ hasSearch = false }: { hasSearch?: boolean }) {
    return (
        <div className="block md:hidden">
            {/* Sticky header skeleton */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
                {hasSearch && (
                    <div className="px-3 pt-2 pb-1">
                        <Skeleton className="h-8 w-full rounded-xl" />
                    </div>
                )}
                {/* Filter tabs */}
                <div className="flex gap-1.5 px-3 py-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-20 rounded-full flex-none" />
                    ))}
                </div>
            </div>

            {/* Item skeletons */}
            <div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                        <Skeleton className="w-[72px] h-[40px] rounded-lg shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-3/4 rounded" />
                            <Skeleton className="h-3 w-1/2 rounded" />
                        </div>
                        <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MobileGroupedReviewSkeleton() {
    return (
        <div className="block md:hidden">
            {/* Sticky header skeleton */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="px-3 pt-2 pb-1">
                    <Skeleton className="h-8 w-full rounded-xl" />
                </div>
                <div className="flex gap-1.5 px-3 py-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-20 rounded-full flex-none" />
                    ))}
                </div>
            </div>

            {/* Group skeletons */}
            <div>
                {Array.from({ length: 3 }).map((_, gi) => (
                    <div key={gi}>
                        {/* Group header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-3.5 w-24 rounded" />
                                <Skeleton className="h-3 w-16 rounded" />
                            </div>
                            <Skeleton className="h-5 w-12 rounded-full" />
                        </div>
                        {/* Group items */}
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                                <Skeleton className="w-[72px] h-[40px] rounded-lg shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-3/4 rounded" />
                                    <Skeleton className="h-3 w-1/2 rounded" />
                                </div>
                                <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

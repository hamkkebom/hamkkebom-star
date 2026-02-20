"use client";

import { useState } from "react";
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragEndEvent,
    DragStartEvent,
    closestCenter,
    MeasuringStrategy,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    type LucideIcon,
    UserX,
    Lock,
    Search,
    CheckCircle2,
    ShieldCheck,
    GripVertical
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types ---

type User = {
    id: string;
    name: string;
    chineseName?: string | null;
    email: string;
    avatarUrl: string | null;
    role?: string;
};

type StarUser = User & {
    managerId: string | null;
    manager: {
        id: string;
        name: string;
        avatarUrl: string | null;
    } | null;
    pendingSubmissionCount?: number;
};

type AssignmentData = {
    currentUser: User;
    stars: StarUser[];
    admins: User[];
};

// --- API Functions ---

async function fetchAssignmentData(): Promise<AssignmentData> {
    const res = await fetch("/api/admin/users/assign");
    if (!res.ok) throw new Error("Failed to fetch data");
    const json = await res.json();
    return json.data;
}

async function updateAssignment(starId: string, managerId: string | null) {
    const res = await fetch("/api/admin/users/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starId, managerId }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
    }
    return res.json();
}

// --- Components ---

function DraggableStar({ star, isOverlay = false }: { star: StarUser; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: star.id,
        data: { star },
        disabled: !!star.managerId && star.managerId !== "CURRENT_USER_ID_PLACEHOLDER"
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const pendingCount = star.pendingSubmissionCount || 0;
    const hasPending = pendingCount > 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "relative group touch-none",
                isDragging && "opacity-0",
            )}
        >
            <motion.div
                layoutId={isOverlay ? undefined : `star-${star.id}`}
                initial={false}
                animate={isOverlay ? { scale: 1.05, rotate: 2, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)" } : { scale: 1, rotate: 0 }}
                className={cn(
                    "relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300",
                    isOverlay
                        ? "bg-background/95 backdrop-blur-xl border-primary/50 cursor-grabbing ring-2 ring-primary/30 shadow-2xl"
                        : "bg-card/60 hover:bg-card/90 border-border/40 hover:border-primary/30 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg hover:-translate-y-0.5",
                    !!star.managerId && "opacity-60 cursor-not-allowed bg-muted/20 border-transparent hover:bg-muted/20 hover:translate-y-0 shadow-none"
                )}
            >
                {/* ★ Pending Badge with Pulse Animation */}
                {hasPending && (
                    <div className="absolute -top-2 -right-2 z-10 flex h-6 min-w-6 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-30" />
                        <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 ring-2 ring-background">
                            <span className="text-[10px] font-black text-white px-1.5 tabular-nums">{pendingCount}</span>
                        </span>
                    </div>
                )}

                {/* Grip Handle */}
                {!star.managerId && !isOverlay && (
                    <div className="text-muted-foreground/15 group-hover:text-muted-foreground/40 transition-colors">
                        <GripVertical className="w-4 h-4" />
                    </div>
                )}

                {/* Avatar with Gradient Ring */}
                <div className="relative">
                    <div className={cn(
                        "rounded-full p-[2px] transition-all duration-300",
                        hasPending
                            ? "bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 shadow-lg shadow-rose-500/20"
                            : "bg-gradient-to-br from-indigo-500 to-violet-500"
                    )}>
                        <Avatar className="h-10 w-10 border-2 border-background">
                            <AvatarImage src={star.avatarUrl || undefined} />
                            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                {star.name.substring(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    {/* Online-style dot */}
                    {!star.managerId && !hasPending && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-sm truncate">{star.chineseName || star.name}</span>
                            {star.chineseName && (
                                <span className="text-[11px] text-muted-foreground/60 font-medium truncate">({star.name})</span>
                            )}
                        </div>
                        {star.managerId && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/80 text-[9px] font-semibold text-muted-foreground border border-border/50">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{star.manager?.name}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate font-medium">{star.email}</span>
                        {hasPending && !star.managerId && (
                            <span className="text-[10px] font-bold text-rose-500 shrink-0">
                                대기 {pendingCount}건
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function DropZone({
    id,
    title,
    count,
    children,
    icon: Icon,
    colorClass,
    subtitle
}: {
    id: string;
    title: string;
    count: number;
    children: React.ReactNode;
    icon: LucideIcon;
    colorClass: string;
    subtitle?: string;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col h-full rounded-[24px] border-2 transition-all duration-500 relative overflow-hidden",
                isOver
                    ? cn("bg-primary/5 border-primary/50 shadow-[0_0_30px_rgba(124,58,237,0.1)] scale-[1.01]", colorClass.replace("bg-", "text-").replace("/10", ""))
                    : "bg-background/40 border-border/60 hover:border-border/80 backdrop-blur-md"
            )}
        >
            {/* Dynamic Background Gradient */}
            <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none", isOver && "opacity-100",
                id === "my-zone" ? "bg-gradient-to-br from-green-500/5 to-emerald-500/5" :
                    id === "unassigned-zone" ? "bg-gradient-to-br from-slate-500/5 to-zinc-500/5" : ""
            )} />

            {/* Header */}
            <div className="p-6 border-b border-border/40 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl shadow-inner", colorClass)}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-none">{title}</h3>
                            {subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>}
                        </div>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset",
                        isOver ? "bg-primary text-primary-foreground ring-primary" : "bg-muted text-muted-foreground ring-border"
                    )}>
                        {count}
                    </div>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 w-full overflow-y-auto min-h-0 scrollbar-pretty">
                <div className="p-4 min-h-[100px] space-y-3">
                    {children}
                </div>
            </div>
        </div>
    );
}


// --- Main Page Component ---

export default function AssignmentPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["admin-assignment"],
        queryFn: fetchAssignmentData,
    });

    const mutation = useMutation({
        mutationFn: ({ starId, managerId }: { starId: string; managerId: string | null }) =>
            updateAssignment(starId, managerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-assignment"] });
            toast.success("담당 정보가 업데이트되었습니다.");
        },
        onError: (err) => {
            toast.error("업데이트 실패: " + err.message);
        }
    });

    // DnD Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // Computed Lists
    const currentUser = data?.currentUser;
    const allStars = data?.stars || [];

    const myStars = allStars.filter(s => s.managerId === currentUser?.id);
    const unassignedStars = allStars.filter(s => !s.managerId);
    const otherStars = allStars.filter(s => s.managerId && s.managerId !== currentUser?.id);

    // Filter logic
    const filterList = (list: StarUser[]) =>
        list.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.chineseName && s.chineseName.toLowerCase().includes(searchTerm.toLowerCase()))
        );

    const displayedMyStars = filterList(myStars);
    const displayedUnassigned = filterList(unassignedStars);

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const starId = active.id as string;
        const targetZone = over.id as string; // 'my-zone' | 'unassigned-zone'

        // Determine intended managerId based on drop zone
        let newManagerId: string | null = null; // Default to 'unassigned'

        if (targetZone === 'my-zone') {
            if (!currentUser) return;
            newManagerId = currentUser.id;
        } else if (targetZone === 'unassigned-zone') {
            newManagerId = null;
        } else {
            return; // Invalid zone
        }

        // Check if change is actually needed
        const star = allStars.find(s => s.id === starId);
        if (!star) return;

        // Prevent moving if already in that state
        if (star.managerId === newManagerId) return;

        // Optimistic Update (Optional, but let's rely on React Query for now for safety)
        mutation.mutate({ starId, managerId: newManagerId });
    };

    const activeStar = activeId ? allStars.find(s => s.id === activeId) : null;

    if (isLoading) return <div className="flex h-full items-center justify-center animate-pulse text-muted-foreground">데이터 로딩 중...</div>;
    if (!currentUser) return <div className="p-10 text-center">권한이 없습니다.</div>;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} // Better hit testing
        >
            <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-6 max-w-[1800px] mx-auto">
                {/* Header */}
                <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                            담당 STAR 배정
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">
                            STAR 회원을 드래그하여 담당자로 배정하거나 해제하세요.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="이름 또는 이메일 검색..."
                            className="pl-10 h-10 rounded-full bg-background/50 border-border/50 focus:bg-background focus:ring-2 ring-primary/20 transition-all font-medium shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                {/* Content Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                    {/* 1. Unassigned Zone (Source) */}
                    <DropZone
                        id="unassigned-zone"
                        title="미배정 회원"
                        subtitle="담당자가 지정되지 않은 회원 목록"
                        count={unassignedStars.length}
                        icon={UserX}
                        colorClass="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    >
                        <AnimatePresence>
                            {displayedUnassigned.map((star) => (
                                <DraggableStar key={star.id} star={star} />
                            ))}
                            {displayedUnassigned.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-muted-foreground/40 text-sm font-medium border-2 border-dashed border-border/50 rounded-xl">
                                    검색 결과가 없거나<br />모든 회원이 배정되었습니다.
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </DropZone>


                    {/* 2. My Team Zone (Target) */}
                    <DropZone
                        id="my-zone"
                        title="내 담당 STAR"
                        subtitle={`${currentUser.name}님에게 배정된 회원`}
                        count={myStars.length}
                        icon={CheckCircle2}
                        colorClass="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    >
                        <AnimatePresence>
                            {displayedMyStars.map((star) => (
                                <DraggableStar key={star.id} star={{ ...star, managerId: "CURRENT_USER_ID_PLACEHOLDER" }} /> // Pass placeholder to enable drag-out
                            ))}
                            {displayedMyStars.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/40 text-sm border-2 border-dashed border-green-500/20 rounded-xl bg-green-500/5">
                                    <p>아직 담당 회원이 없습니다.</p>
                                    <p className="text-[10px] mt-1 text-green-600/60">왼쪽에서 카드를 드래그하세요!</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </DropZone>


                    {/* 3. Other Managers (Read Only) */}
                    <div className="flex flex-col h-full rounded-[24px] border border-border/40 bg-background/20 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                        <div className="p-6 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-none">타 관리자 담당</h3>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">다른 관리자에게 배정된 회원 (잠금)</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                                    {otherStars.length}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-pretty">
                            <div className="space-y-3">
                                {filterList(otherStars).map((star) => (
                                    <div key={star.id} className="opacity-70 grayscale-[0.3]">
                                        <DraggableStar star={star} /> {/* Will be disabled automatically */}
                                    </div>
                                ))}
                                {otherStars.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground/40 text-sm">
                                        다른 관리자에게 배정된 회원이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeStar ? (
                    <DraggableStar star={activeStar} isOverlay />
                ) : null}
            </DragOverlay>

        </DndContext >
    );
}

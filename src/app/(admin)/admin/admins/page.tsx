"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    UserCog,
    Plus,
    Trash2,
    ShieldCheck,
    Search,
    X,
    Loader2,
    Mail,
    Lock,
    User
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Types ---
type AdminUser = {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
    _count: {
        managedStars: number;
    };
};

const createAdminSchema = z.object({
    name: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
    email: z.string().email("유효한 이메일 주소를 입력하세요."),
    password: z.string().min(6, "비밀번호는 6자리 이상이어야 합니다."),
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

// --- Components ---

function AdminCard({ admin, isMe, onDelete }: { admin: AdminUser; isMe: boolean; onDelete: (id: string) => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10"
        >
            {/* Background Gradient Animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Avatar Ring */}
                <div className="relative mb-4">
                    <div className="absolute -inset-1 animate-pulse rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-20 blur-md transition-opacity group-hover:opacity-40" />
                    <Avatar className="h-20 w-20 border-2 border-white/10 shadow-xl">
                        <AvatarImage src={admin.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-900 text-xl font-bold text-white">
                            {admin.name.substring(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 shadow-lg ring-2 ring-slate-950">
                        <ShieldCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                </div>

                <h3 className="mb-1 text-lg font-bold text-slate-100">{admin.name}</h3>
                <p className="mb-4 text-xs font-medium text-slate-400">{admin.email}</p>

                {/* Stats */}
                <div className="mb-6 flex w-full justify-center gap-4 border-y border-white/5 py-3">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-500">담당 STAR</span>
                        <span className="text-lg font-bold text-indigo-400 tabular-nums">
                            {admin._count.managedStars}
                        </span>
                    </div>
                    <div className="flex flex-col items-center border-l border-white/5 pl-4">
                        <span className="text-xs text-slate-500">가입일</span>
                        <span className="text-xs font-medium text-slate-300">
                            {new Date(admin.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Action */}
                {!isMe ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(admin.id)}
                        className="w-full rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        계정 삭제
                    </Button>
                ) : (
                    <div className="flex h-9 w-full items-center justify-center rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-400">
                        현재 로그인 중
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function CreateAdminModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (data: CreateAdminForm) => void }) {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CreateAdminForm>({
        resolver: zodResolver(createAdminSchema),
    });

    const onSubmit = async (data: CreateAdminForm) => {
        await onCreate(data);
        reset();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
                    >
                        <div className="relative overflow-hidden rounded-3xl p-6">
                            {/* Header Gradient */}
                            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                            <div className="mb-6 flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">새 관리자 추가</h2>
                                    <p className="text-sm text-slate-400">새로운 관리자 계정을 생성합니다.</p>
                                </div>
                                <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            placeholder="이름 (예: 김관리)"
                                            {...register("name")}
                                            className="pl-10 bg-slate-950/50 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    {errors.name && <p className="text-xs text-red-500 ml-1">{errors.name.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            placeholder="이메일 (예: admin@example.com)"
                                            {...register("email")}
                                            className="pl-10 bg-slate-950/50 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            type="password"
                                            placeholder="비밀번호 (6자리 이상)"
                                            {...register("password")}
                                            className="pl-10 bg-slate-950/50 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                생성 중...
                                            </>
                                        ) : (
                                            "관리자 계정 생성"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// --- Main Page ---

export default function AdminsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // 1. Fetch Admins
    const { data: admins = [], isLoading } = useQuery<AdminUser[]>({
        queryKey: ["admins"],
        queryFn: async () => {
            const res = await fetch("/api/admin/managers");
            if (!res.ok) throw new Error("Failed to fetch admins");
            const json = await res.json();
            return json.data;
        },
    });

    // 2. Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateAdminForm) => {
            const res = await fetch("/api/admin/managers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create admin");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            setIsModalOpen(false);
            toast.success("새로운 관리자가 생성되었습니다!");
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    // 3. Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            // TODO: Implement DELETE API
            // const res = await fetch(`/api/admin/managers/${id}`, { method: "DELETE" });
            // if (!res.ok) throw new Error("Failed");

            // 임시로 알림만 (API 아직 없으므로)
            return new Promise((resolve) => setTimeout(resolve, 500));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            toast.success("관리자 계정이 삭제되었습니다.");
        },
        onError: () => toast.error("삭제 실패")
    });

    // Fetch current user info for "isMe" check (Simple approach: check email from another query or store)
    // For now, let's assume we can match by some ID or just hide delete for now.
    // A better way is to get 'me' from API.
    const { data: me } = useQuery({
        queryKey: ["me"],
        queryFn: async () => {
            const res = await fetch("/api/users/me");
            const json = await res.json();
            return json.data;
        }
    });


    /* Filter */
    const filteredAdmins = admins.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col gap-8 p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <UserCog className="h-8 w-8 text-indigo-500" />
                        관리자 계정 관리
                    </h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                        시스템 접근 권한을 가진 관리자를 추가하고 관리합니다.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                            placeholder="이름, 이메일 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-11 w-full min-w-[300px] rounded-full bg-background/50 pl-10 ring-1 ring-border/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                        />
                    </div>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="h-11 rounded-full bg-indigo-500 px-6 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40 active:scale-95"
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        관리자 추가
                    </Button>
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500/50" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AnimatePresence mode="popLayout">
                        {filteredAdmins.map((admin) => (
                            <AdminCard
                                key={admin.id}
                                admin={admin}
                                isMe={me?.email === admin.email} // Simple check
                                onDelete={(id) => {
                                    if (confirm("정말 이 관리자 계정을 삭제하시겠습니까? (되돌릴 수 없습니다)")) {
                                        // deleteMutation.mutate(id);
                                        toast.info("삭제 기능은 안전을 위해 아직 비활성화되어 있습니다.");
                                    }
                                }}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Add Button as Card (Optional Style) */}
                    <motion.button
                        layout
                        onClick={() => setIsModalOpen(true)}
                        className="group flex h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-400 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 transition-all group-hover:scale-110 group-hover:bg-indigo-500/20">
                            <Plus className="h-8 w-8" />
                        </div>
                        <span className="font-bold">새 관리자 등록하기</span>
                    </motion.button>
                </div>
            )}

            {/* Modal */}
            <CreateAdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={(data) => createMutation.mutate(data)}
            />
        </div>
    );
}

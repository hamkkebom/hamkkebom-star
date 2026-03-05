"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { CheckCircle2, XCircle, User, Mail, ShieldCheck } from "lucide-react";

export type SwipeableUser = {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
    role: string;
    avatarUrl?: string | null;
    createdAt: string;
};

interface UserSwipeDeckProps {
    users: SwipeableUser[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onViewDetail: (user: SwipeableUser) => void;
}

export function UserSwipeDeck({ users, onApprove, onReject, onViewDetail }: UserSwipeDeckProps) {
    const [deck, setDeck] = useState(users);

    React.useEffect(() => {
        setDeck(users);
    }, [users]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, user: SwipeableUser) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            // Swiped Right -> Approve
            onApprove(user.id);
            setDeck((prev) => prev.filter((u) => u.id !== user.id));
        } else if (info.offset.x < -threshold) {
            // Swiped Left -> Reject
            onReject(user.id);
            setDeck((prev) => prev.filter((u) => u.id !== user.id));
        }
    };

    if (deck.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl mx-4 my-8">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-5">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 opacity-80" />
                </div>
                <p className="font-bold text-xl text-slate-900 dark:text-white">모든 처리가 완료되었습니다!</p>
                <p className="text-sm mt-2 text-slate-500 text-balance">더 이상 승인 대기 중인 가입자가 없습니다.</p>
            </div>
        );
    }

    const visibleUsers = deck.slice(0, 3).reverse();

    return (
        <div className="relative w-full aspect-[3/4] max-h-[500px] flex items-center justify-center perspective-1000 mt-4 mb-8">
            <AnimatePresence>
                {visibleUsers.map((user, index) => {
                    const isTop = index === visibleUsers.length - 1;

                    return (
                        <motion.div
                            key={user.id}
                            className="absolute w-full h-[420px] max-w-sm rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 touch-none flex flex-col z-10"
                            style={{
                                zIndex: index,
                                transformOrigin: "bottom",
                            }}
                            initial={{ scale: 0.95, y: 30, opacity: 0 }}
                            animate={{
                                scale: isTop ? 1 : 1 - (visibleUsers.length - 1 - index) * 0.05,
                                y: isTop ? 0 : (visibleUsers.length - 1 - index) * 20,
                                opacity: 1,
                            }}
                            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                            drag={isTop ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.8}
                            onDragEnd={(e, info) => isTop && handleDragEnd(e, info, user)}
                        >
                            <div className="flex-1 flex flex-col items-center p-8 pointer-events-none bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-500/10 dark:to-slate-900">
                                {/* Header */}
                                <div className="w-full flex justify-between items-start mb-6">
                                    <div className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold w-fit">
                                        가입 대기중
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold w-fit text-slate-500 uppercase tracking-widest">
                                        {user.role}
                                    </div>
                                </div>

                                {/* Avatar */}
                                <div className="w-32 h-32 rounded-[28px] bg-white dark:bg-slate-800 shadow-xl border-4 border-white dark:border-slate-800 flex items-center justify-center mb-6 overflow-hidden">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                                            <User className="w-12 h-12 text-indigo-300 dark:text-indigo-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="text-center w-full space-y-1 mb-6">
                                    <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                                        {user.name}
                                    </h3>
                                    {user.chineseName && (
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                            {user.chineseName}
                                        </p>
                                    )}
                                </div>

                                <div className="w-full mt-auto bg-white/50 dark:bg-black/20 rounded-2xl p-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
                                    <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">이메일</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Guides */}
                            <div className="h-24 bg-slate-50 dark:bg-[#0c0c14] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
                                <div className="flex flex-col items-center opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-12 rounded-full border-2 border-rose-500/30 flex items-center justify-center mb-1 bg-rose-50 dark:bg-rose-500/10">
                                        <XCircle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-rose-500 tracking-wider">거절</span>
                                </div>

                                <div className="flex flex-col items-center justify-center w-full max-w-[120px]">
                                    <button
                                        className="w-full pointer-events-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 h-10 rounded-full text-xs font-bold active:scale-95 transition-all shadow-sm"
                                        onClick={() => onViewDetail(user)}
                                    >
                                        서류 확인
                                    </button>
                                    <span className="text-[9px] text-slate-400 mt-2 font-medium">좌우로 스와이프</span>
                                </div>

                                <div className="flex flex-col items-center opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 flex items-center justify-center mb-1 bg-emerald-50 dark:bg-emerald-500/10">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-500 tracking-wider">승인</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

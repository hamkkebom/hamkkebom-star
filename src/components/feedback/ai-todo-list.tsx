"use client";
import { useState } from "react";
import { CheckCircle2, Sparkles, Zap, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";

export function AiTodoList({ feedbackCount }: { feedbackCount: number }) {
    const [todos, setTodos] = useState([
        { id: 1, text: "오디오 레벨 -14 LUFS로 조정하기", completed: false, ai: true },
        { id: 2, text: "인트로 자막 폰트 크기 키우기", completed: false, ai: true },
        { id: 3, text: "3분 20초 컷 편집 호흡 조절", completed: false, ai: false },
    ]);

    const handleCheck = (id: number) => {
        setTodos(prev => prev.map(t => {
            // Trigger confetti on completion (transitioning from false to true)
            if (t.id === id && !t.completed) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1']
                });
            }
            return t.id === id ? { ...t, completed: !t.completed } : t;
        }));
    };

    const completedCount = todos.filter(t => t.completed).length;
    const progress = Math.round((completedCount / todos.length) * 100);

    return (
        <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 font-extrabold">달토끼 AI 퀘스트</span>
                </h3>
                <Badge variant="secondary" className="text-[10px] font-mono h-5 bg-white/10 text-white hover:bg-white/20">
                    {completedCount}/{todos.length}
                </Badge>
            </div>

            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-2">
                {todos.map((todo) => (
                    <div
                        key={todo.id}
                        onClick={() => handleCheck(todo.id)}
                        className={cn(
                            "group flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-white/5",
                            todo.completed ? "opacity-50" : "hover:border-white/10"
                        )}
                    >
                        <div className={cn(
                            "mt-0.5 w-4 h-4 flex items-center justify-center rounded-full border transition-colors",
                            todo.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-white/30 group-hover:border-emerald-400"
                        )}>
                            {todo.completed && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className={cn(
                                "text-xs font-medium leading-tight transition-all",
                                todo.completed && "line-through text-muted-foreground"
                            )}>
                                {todo.text}
                            </p>
                            {todo.ai && (
                                <span className="inline-flex items-center gap-1 text-[9px] text-fuchsia-400 font-bold uppercase tracking-wider">
                                    <Moon className="w-2.5 h-2.5" /> 달토끼의 꿀팁
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

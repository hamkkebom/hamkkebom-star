"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type DataPoint = {
    name: string;
    value: number;
};

const COLORS = {
    COMPLETED: { light: "#10b981", dark: "#34d399" }, // emerald
    PENDING: { light: "#f59e0b", dark: "#fbbf24" }, // amber
    CARRIED_OVER: { light: "#6366f1", dark: "#818cf8" }, // indigo
    OTHER: { light: "#94a3b8", dark: "#cbd5e1" } // slate
};

export function RevenueDonutChart({ data }: { data: DataPoint[] }) {
    const isDark = true;

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="w-full h-full min-h-[300px] relative flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        animationDuration={1500}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, index) => {
                            let colorGroup = COLORS.OTHER;
                            if (entry.name === "COMPLETED") colorGroup = COLORS.COMPLETED;
                            else if (entry.name === "PENDING") colorGroup = COLORS.PENDING;
                            else if (entry.name === "CARRIED_OVER") colorGroup = COLORS.CARRIED_OVER;

                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={isDark ? colorGroup.dark : colorGroup.light}
                                />
                            );
                        })}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const formatted = new Intl.NumberFormat("ko-KR", {
                                    style: "currency",
                                    currency: "KRW",
                                    maximumFractionDigits: 0
                                }).format(data.value);

                                const label = data.name === "COMPLETED" ? "정산 완료" :
                                    data.name === "PENDING" ? "대기/예정" :
                                        data.name === "CARRIED_OVER" ? "이월" : data.name;

                                return (
                                    <div className="bg-muted dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl flex flex-col gap-1">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-foreground">{formatted}</span>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Total Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">총 금액</span>
                <span className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tighter">
                    {new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(total)}
                </span>
            </div>
        </div>
    );
}

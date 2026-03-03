"use client";

import { useTheme } from "next-themes";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type DataPoint = {
    date: string;
    submitted: number;
    approved: number;
};

export function TrendAreaChart({ data }: { data: DataPoint[] }) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const indigo = isDark ? "#818cf8" : "#6366f1"; // indigo-400 / indigo-500
    const emerald = isDark ? "#34d399" : "#10b981"; // emerald-400 / emerald-500
    const textColor = isDark ? "#94a3b8" : "#64748b"; // slate-400 / slate-500
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={indigo} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={indigo} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={emerald} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={emerald} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: textColor, fontSize: 12 }}
                        dy={10}
                        tickFormatter={(val) => {
                            const parts = val.split("-");
                            if (parts.length === 2) {
                                return `${parseInt(parts[0])}.${parseInt(parts[1])}`;
                            }
                            return val;
                        }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: textColor, fontSize: 12 }}
                        dx={-10}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">{label} 데이터</p>
                                        {payload.map((entry, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs font-medium mt-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                <span className="text-slate-500 dark:text-slate-400">{entry.name === 'submitted' ? '접수 건수' : '승인 건수'}:</span>
                                                <span className="text-slate-900 dark:text-white font-bold">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="submitted"
                        name="submitted"
                        stroke={indigo}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSubmitted)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: indigo }}
                    />
                    <Area
                        type="monotone"
                        dataKey="approved"
                        name="approved"
                        stroke={emerald}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorApproved)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: emerald }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

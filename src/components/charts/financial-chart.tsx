"use client";

import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";

export interface FinancialTrendChartProps {
  data: Array<{ date: string; total: number; paid: number }>;
  amber: string;
  rose: string;
  textColor: string;
  gridColor: string;
}

export function FinancialTrendChart({ data, amber, rose, textColor, gridColor }: FinancialTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={amber} stopOpacity={0.3} />
            <stop offset="95%" stopColor={amber} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={rose} stopOpacity={0.3} />
            <stop offset="95%" stopColor={rose} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dx={-10}
          tickFormatter={(val) => new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(val)} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-muted dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">{label}</p>
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-medium mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-500 dark:text-slate-400">{entry.name === 'total' ? '총 정산액' : '지급 완료'}:</span>
                      <span className="text-slate-900 dark:text-foreground font-bold">₩{new Intl.NumberFormat("ko-KR").format(Number(entry.value))}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        <Area type="monotone" dataKey="total" name="total" stroke={amber} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: amber }} />
        <Area type="monotone" dataKey="paid" name="paid" stroke={rose} strokeWidth={3} fillOpacity={1} fill="url(#colorPaid)" activeDot={{ r: 6, strokeWidth: 0, fill: rose }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default FinancialTrendChart;

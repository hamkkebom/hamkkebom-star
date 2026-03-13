"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Cell,
} from "recharts";

const COLORS = ["#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-muted dark:bg-zinc-900/90 border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// --- Monthly Cost Trend ---
export interface MonthlyCostTrendChartProps {
  data: Array<{ month: string; cost: number; approved: number }> | undefined;
}

export function MonthlyCostTrendChart({ data }: MonthlyCostTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="cost" name="비용"
          stroke="#7C3AED" fill="url(#costGradient)" strokeWidth={2}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// --- Category ROI Chart ---
export interface CategoryROIChartProps {
  data: Array<{ category: string; cost: number; approved: number; total: number; costPerApproved: number; approvalRate: number }> | undefined;
}

export function CategoryROIChart({ data }: CategoryROIChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="cost" name="비용" radius={[0, 4, 4, 0]} animationDuration={800}>
          {data?.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MonthlyCostTrendChart;

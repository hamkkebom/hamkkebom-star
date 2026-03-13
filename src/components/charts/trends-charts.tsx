"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell,
} from "recharts";

const STACK_COLORS = ["#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#06B6D4"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-muted dark:bg-zinc-900/90 border rounded-xl p-3 shadow-lg text-xs max-w-[200px]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}: {p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// --- Production Trend Chart ---
export interface ProductionTrendChartProps {
  data: Array<{ period: string; total: number; approved: number; approvalRate: number }> | undefined;
}

export function ProductionTrendChart({ data }: ProductionTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="total" name="전체" stroke="#7C3AED" fill="url(#totalGrad)" strokeWidth={2} animationDuration={800} />
        <Area type="monotone" dataKey="approved" name="승인" stroke="#10B981" fill="url(#approvedGrad)" strokeWidth={2} animationDuration={800} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// --- Category Stack Chart ---
export interface CategoryStackChartProps {
  data: Array<Record<string, string | number>>;
  categories: string[];
}

export function CategoryStackChart({ data, categories }: CategoryStackChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        {categories.slice(0, 8).map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            name={cat}
            stackId="a"
            fill={STACK_COLORS[i % STACK_COLORS.length]}
            animationDuration={800}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Growth Rate Chart ---
export interface GrowthRateChartProps {
  data: Array<{ period: string; growth: number }> | undefined;
}

export function GrowthRateChart({ data }: GrowthRateChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="growth" name="성장률" radius={[4, 4, 0, 0]} animationDuration={800}>
          {data?.map((entry, i) => (
            <Cell key={i} fill={entry.growth >= 0 ? "#10B981" : "#EF4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default ProductionTrendChart;

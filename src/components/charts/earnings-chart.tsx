"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatKRW } from "@/lib/settlement-utils";

type MonthlyEarning = { month: string; amount: number; count: number };

export interface EarningsChartProps {
  data: MonthlyEarning[];
}

export function EarningsChart({ data }: EarningsChartProps) {
  return (
    <div className="h-44 sm:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v.split("-")[1] + "월"}
            stroke="var(--muted-foreground)"
            opacity={0.5}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => v >= 10000 ? `${Math.round(v / 10000)}만` : `${v}`}
            stroke="var(--muted-foreground)"
            opacity={0.5}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [formatKRW(Number(value)), "수입"]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => {
              const [y, m] = String(label).split("-");
              return `${y}년 ${parseInt(m)}월`;
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fill="url(#earningsGrad)"
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default EarningsChart;

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type VideoStatMonth = { month: string; submitted: number; approved: number; feedbacks: number };

export interface DashboardChartProps {
  data: VideoStatMonth[];
}

export function DashboardChart({ data }: DashboardChartProps) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v.split("-")[1] + "월"}
            stroke="var(--muted-foreground)"
            opacity={0.5}
          />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" opacity={0.5} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            labelFormatter={(label: unknown) => {
              const [y, m] = String(label).split("-");
              return `${y}년 ${parseInt(m)}월`;
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="submitted" name="제출" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="approved" name="승인" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="feedbacks" name="피드백" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DashboardChart;

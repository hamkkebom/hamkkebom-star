"use client";

import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const DIST_COLORS = ["#EF4444", "#F59E0B", "#FBBF24", "#10B981", "#7C3AED"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-muted dark:bg-zinc-900/90 border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// --- Quality Gauge ---
export interface QualityGaugeProps {
  score: number;
}

export function QualityGauge({ score }: QualityGaugeProps) {
  const data = [{ name: "score", value: score, fill: score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444" }];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          cx="50%" cy="55%"
          innerRadius="65%"
          outerRadius="95%"
          startAngle={210}
          endAngle={-30}
          data={data}
          barSize={14}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            background={{ fill: "#e5e7eb" }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">전체 평균</span>
      </div>
    </div>
  );
}

// --- Category Radar Chart ---
export interface CategoryRadarChartProps {
  data: Array<{ metric: string; value: number; fullMark: number }>;
}

export function CategoryRadarChart({ data }: CategoryRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value" name="평균 점수"
          stroke="#EC4899" fill="#EC4899" fillOpacity={0.2} strokeWidth={2}
          animationDuration={800}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// --- Distribution Histogram ---
export interface DistributionChartProps {
  data: Array<{ range: string; count: number }> | undefined;
}

export function DistributionChart({ data }: DistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="영상 수" radius={[6, 6, 0, 0]} animationDuration={800}>
          {data?.map((_, i) => (
            <Cell key={i} fill={DIST_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Monthly Trend Line ---
export interface MonthlyTrendChartProps {
  data: Array<{ month: string; avgScore: number; count: number }> | undefined;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone" dataKey="avgScore" name="평균 점수"
          stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default QualityGauge;

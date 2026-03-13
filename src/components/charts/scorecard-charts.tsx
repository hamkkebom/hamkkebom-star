"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from "recharts";

// --- Gauge Chart ---
export interface GaugeChartProps {
  value: number;
  max?: number;
  color: string;
}

export function GaugeChart({ value, color }: GaugeChartProps) {
  const data = [{ name: "score", value, fill: color }];
  return (
    <ResponsiveContainer width="100%" height={120}>
      <RadialBarChart
        cx="50%" cy="50%"
        innerRadius="70%"
        outerRadius="100%"
        startAngle={180}
        endAngle={0}
        data={data}
        barSize={10}
      >
        <RadialBar
          dataKey="value"
          cornerRadius={8}
          background={{ fill: "#e5e7eb" }}
        />
        <text x="50%" y="55%" textAnchor="middle" className="text-lg font-bold fill-foreground">
          {value}%
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

// --- Star Radar Chart ---
export interface StarRadarChartProps {
  star: {
    name: string;
    metrics: {
      deadlineRate: number;
      feedbackRate: number;
      qualityScore: number;
      firstApprovalRate: number;
      avgRevisions: number;
    };
  };
}

export function StarRadarChart({ star }: StarRadarChartProps) {
  const radarData = [
    { metric: "납기", value: star.metrics.deadlineRate, fullMark: 100 },
    { metric: "피드백", value: star.metrics.feedbackRate, fullMark: 100 },
    { metric: "품질", value: star.metrics.qualityScore, fullMark: 100 },
    { metric: "1차 승인", value: star.metrics.firstApprovalRate, fullMark: 100 },
    { metric: "효율", value: Math.max(0, 100 - star.metrics.avgRevisions * 30), fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={star.name}
          dataKey="value"
          stroke="#7C3AED"
          fill="#7C3AED"
          fillOpacity={0.2}
          strokeWidth={2}
          animationDuration={800}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default GaugeChart;

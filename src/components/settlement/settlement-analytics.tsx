"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Users, FileText, Calculator, Wallet } from "lucide-react";

// OKLCH 호환 HSL 색상 팔레트
const COLORS = [
  "hsl(220, 90%, 56%)",
  "hsl(160, 84%, 39%)",
  "hsl(35, 92%, 50%)",
  "hsl(340, 82%, 52%)",
  "hsl(270, 76%, 55%)",
  "hsl(195, 85%, 45%)",
  "hsl(140, 70%, 42%)",
  "hsl(15, 88%, 55%)",
];

type AnalyticsData = {
  monthlyTrend: Array<{
    month: string;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
    count: number;
    starCount: number;
  }>;
  starDistribution: Array<{
    starId: string;
    starName: string;
    totalAmount: number;
    percentage: number;
  }>;
  summary: {
    currentMonth: { total: number; tax: number; net: number; count: number };
    previousMonth: { total: number; tax: number; net: number; count: number };
    changeRate: number;
    avgPerItem: number;
    avgPerStar: number;
  };
  itemTypeDistribution: Array<{
    itemType: string;
    totalAmount: number;
    count: number;
  }>;
  statusCounts: Record<string, number>;
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  SUBMISSION: "작품료",
  AI_TOOL_SUPPORT: "AI 툴 지원비",
  BONUS: "보너스",
  DEDUCTION: "공제",
  PENALTY: "패널티",
  TRANSPORT: "교통비",
  EQUIPMENT: "장비비",
  OTHER: "기타",
};

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

function formatCompact(amount: number): string {
  if (amount >= 10000) {
    return Math.round(amount / 10000) + "만";
  }
  return new Intl.NumberFormat("ko-KR").format(amount);
}

export default function SettlementAnalytics() {
  const { data, isLoading } = useQuery<{ data: AnalyticsData }>({
    queryKey: ["settlement-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/settlements/analytics");
      if (!res.ok) throw new Error("분석 데이터 로드 실패");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data?.data) return null;

  const analytics = data.data;
  const { summary } = analytics;

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="이번 달 총액"
          value={formatKRW(summary.currentMonth.total)}
          change={summary.changeRate}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KPICard
          title="실지급액"
          value={formatKRW(summary.currentMonth.net)}
          subtitle={`세금 ${formatKRW(summary.currentMonth.tax)}`}
          icon={<Calculator className="h-4 w-4" />}
        />
        <KPICard
          title="평균 건당 단가"
          value={formatKRW(summary.avgPerItem)}
          icon={<FileText className="h-4 w-4" />}
        />
        <KPICard
          title="STAR 평균"
          value={formatKRW(summary.avgPerStar)}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 월별 추이 라인 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">월별 정산 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={analytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip
                    formatter={((v: unknown, name: unknown) => [
                      formatKRW(Number(v ?? 0)),
                      name === "totalAmount" ? "세전 금액" :
                      name === "netAmount" ? "실지급액" : "세금",
                    ]) as never}
                    labelFormatter={(label) => `${String(label).replace("-", "년 ")}월`}
                  />
                  <Legend
                    formatter={(v) =>
                      v === "totalAmount" ? "세전 금액" :
                      v === "netAmount" ? "실지급액" : "세금"
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="hsl(220, 90%, 56%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netAmount"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="taxAmount"
                    stroke="hsl(35, 92%, 50%)"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                정산 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* STAR별 분포 도넛 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">STAR별 정산 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.starDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={280}>
                  <PieChart>
                    <Pie
                      data={analytics.starDistribution.slice(0, 8)}
                      dataKey="totalAmount"
                      nameKey="starName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                    >
                      {analytics.starDistribution.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={((v: any) => formatKRW(Number(v ?? 0))) as any} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {analytics.starDistribution.slice(0, 8).map((star, i) => (
                    <div key={star.starId} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate flex-1">{star.starName}</span>
                      <span className="font-medium tabular-nums">{star.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                STAR 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 항목 유형별 막대 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">항목 유형별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.itemTypeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={analytics.itemTypeDistribution.map((d) => ({
                    ...d,
                    label: ITEM_TYPE_LABELS[d.itemType] || d.itemType,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={((v: any) => formatKRW(Number(v ?? 0))) as any} />
                  <Bar dataKey="totalAmount" fill="hsl(220, 90%, 56%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                항목 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 월별 건수/STAR수 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">월별 정산 건수</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={((v: unknown, name: unknown) => [
                      `${Number(v ?? 0)}건`,
                      name === "count" ? "정산 건수" : "STAR 수",
                    ]) as never}
                    labelFormatter={(label) => `${String(label).replace("-", "년 ")}월`}
                  />
                  <Legend
                    formatter={(v) =>
                      v === "count" ? "정산 건수" : "STAR 수"
                    }
                  />
                  <Bar dataKey="count" fill="hsl(220, 90%, 56%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="starCount" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, change, subtitle, icon }: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
            change > 0 ? "text-emerald-500" : change < 0 ? "text-red-500" : "text-muted-foreground"
          }`}>
            {change > 0 ? <TrendingUp className="h-3 w-3" /> :
             change < 0 ? <TrendingDown className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
            <span>{change > 0 ? "+" : ""}{change}% 전월 대비</span>
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

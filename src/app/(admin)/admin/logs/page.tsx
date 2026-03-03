"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ScrollText, Activity, Calendar, User, Zap } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { AnimatedCard } from "@/components/settlement/animated-card";
import { GlowBadge } from "@/components/settlement/glow-badge";
import { NumberTicker } from "@/components/settlement/number-ticker";
import { cn } from "@/lib/utils";

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { from?: unknown; to?: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
};

type AuditLogsResponse = {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function getActionColor(action: string): string {
  if (action.startsWith("APPROVE_")) return "bg-emerald-500";
  if (action.startsWith("REJECT_")) return "bg-red-500";
  if (action.startsWith("CREATE_")) return "bg-cyan-500";
  if (action.startsWith("DELETE_")) return "bg-rose-500";
  if (action.startsWith("ADJUST_")) return "bg-amber-500";
  if (action.startsWith("GENERATE_")) return "bg-violet-500";
  if (action.startsWith("BULK_")) return "bg-indigo-500";
  if (action.startsWith("UPDATE_")) return "bg-blue-500";
  if (action.startsWith("COMPLETE_")) return "bg-teal-500";
  if (action.startsWith("CANCEL_")) return "bg-orange-500";
  if (action.startsWith("REVOKE_")) return "bg-red-400";
  if (action.startsWith("ACCEPT_")) return "bg-green-500";
  return "bg-muted-foreground";
}

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

function getActionVariant(action: string): GlowVariant {
  if (action.startsWith("APPROVE_") || action.startsWith("ACCEPT_") || action.startsWith("COMPLETE_")) return "approved";
  if (action.startsWith("REJECT_") || action.startsWith("DELETE_") || action.startsWith("REVOKE_")) return "failed";
  if (action.startsWith("GENERATE_") || action.startsWith("BULK_")) return "processing";
  if (action.startsWith("ADJUST_") || action.startsWith("UPDATE_") || action.startsWith("CANCEL_")) return "pending";
  return "pending";
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    APPROVE_USER: "사용자 승인",
    REVOKE_USER: "사용자 취소",
    CREATE_PROJECT_REQUEST: "제작요청 생성",
    UPDATE_PROJECT_REQUEST: "제작요청 수정",
    DELETE_PROJECT_REQUEST: "제작요청 삭제",
    ACCEPT_PROJECT_REQUEST: "제작요청 수락",
    APPROVE_ASSIGNMENT: "배정 승인",
    REJECT_ASSIGNMENT: "배정 거절",
    APPROVE_SUBMISSION: "제출물 승인",
    REJECT_SUBMISSION: "제출물 거절",
    BULK_ACTION_SUBMISSIONS: "제출물 일괄처리",
    CREATE_FEEDBACK: "피드백 생성",
    DELETE_FEEDBACK: "피드백 삭제",
    GENERATE_SETTLEMENTS: "정산 생성",
    COMPLETE_SETTLEMENT: "정산 확정",
    CANCEL_SETTLEMENT: "정산 취소",
    DELETE_SETTLEMENT: "정산 삭제",
    ADJUST_SETTLEMENT_ITEM: "정산 항목 조정",
  };
  return map[action] || action;
}

function getEntityLabel(entityType: string): string {
  const map: Record<string, string> = {
    User: "사용자",
    ProjectRequest: "제작요청",
    ProjectAssignment: "배정",
    Submission: "제출물",
    Feedback: "피드백",
    Settlement: "정산",
    SettlementItem: "정산 항목",
  };
  return map[entityType] || entityType;
}

function getActionVerb(action: string): string {
  if (action.startsWith("CREATE_") || action.startsWith("GENERATE_")) return "생성";
  if (action.startsWith("UPDATE_") || action.startsWith("ADJUST_")) return "수정";
  if (action.startsWith("DELETE_") || action.startsWith("REVOKE_") || action.startsWith("CANCEL_")) return "삭제/취소";
  if (action.startsWith("APPROVE_") || action.startsWith("ACCEPT_") || action.startsWith("COMPLETE_")) return "승인/확정";
  if (action.startsWith("REJECT_")) return "거절";
  if (action.startsWith("BULK_")) return "일괄처리";
  return "처리";
}

function ExpandableChanges({ changes }: { changes: Record<string, { from?: unknown; to?: unknown }> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        변경 내역 {expanded ? "접기" : "보기"}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 p-2 rounded-lg bg-muted/50 text-xs font-mono space-y-1">
              {Object.entries(changes).map(([field, { from, to }]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{field}:</span>
                  <span className="text-red-500 line-through">{String(from ?? "—")}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-500">{String(to ?? "—")}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminLogsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterEntityType, setFilterEntityType] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, filterAction, filterEntityType, search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (filterAction !== "ALL") params.set("action", filterAction);
    if (filterEntityType !== "ALL") params.set("entityType", filterEntityType);
    if (search) params.set("search", search);
    return params.toString();
  }, [page, startDate, endDate, filterAction, filterEntityType, search]);

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["admin-audit-logs", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    refetchInterval: false,
  });

  const logs = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = data?.totalPages || 1;

  const stats = useMemo(() => {
    if (!logs.length) return { todayCount: 0, weekCount: 0, topActor: "없음", topAction: "없음" };
    
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let weekCount = 0;
    const actorCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};

    logs.forEach((log: AuditLogEntry) => {
      const logDate = new Date(log.createdAt);
      const logDateStr = logDate.toISOString().split("T")[0];
      
      if (logDateStr === todayStr) todayCount++;
      if (logDate >= weekAgo) weekCount++;

      actorCounts[log.actor.name] = (actorCounts[log.actor.name] || 0) + 1;
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const topActor = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "없음";
    const topActionKey = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "없음";
    const topAction = topActionKey !== "없음" ? getActionLabel(topActionKey) : "없음";

    return { todayCount, weekCount, topActor, topAction };
  }, [logs]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">활동 로그</h1>
        <p className="text-muted-foreground mt-2">시스템 내 모든 관리자 및 주요 활동 내역을 확인합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard delay={0.05} className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">오늘 활동</span>
          </div>
          <div className="text-2xl font-bold">
            <NumberTicker value={stats.todayCount} />
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.1} className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">이번 주 활동</span>
          </div>
          <div className="text-2xl font-bold">
            <NumberTicker value={stats.weekCount} />
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.15} className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">가장 활발한 관리자</span>
          </div>
          <div className="text-2xl font-bold truncate">{stats.topActor}</div>
        </AnimatedCard>
        <AnimatedCard delay={0.2} className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">가장 많은 액션</span>
          </div>
          <div className="text-2xl font-bold truncate">{stats.topAction}</div>
        </AnimatedCard>
      </div>

      <AnimatedCard delay={0.25}>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" placeholder="시작일" />
          <span className="text-muted-foreground text-sm">~</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" placeholder="종료일" />
          
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="액션 유형" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value="APPROVE_USER">사용자 승인</SelectItem>
              <SelectItem value="REVOKE_USER">사용자 취소</SelectItem>
              <SelectItem value="CREATE_PROJECT_REQUEST">제작요청 생성</SelectItem>
              <SelectItem value="UPDATE_PROJECT_REQUEST">제작요청 수정</SelectItem>
              <SelectItem value="DELETE_PROJECT_REQUEST">제작요청 삭제</SelectItem>
              <SelectItem value="ACCEPT_PROJECT_REQUEST">제작요청 수락</SelectItem>
              <SelectItem value="APPROVE_ASSIGNMENT">배정 승인</SelectItem>
              <SelectItem value="REJECT_ASSIGNMENT">배정 거절</SelectItem>
              <SelectItem value="APPROVE_SUBMISSION">제출물 승인</SelectItem>
              <SelectItem value="REJECT_SUBMISSION">제출물 거절</SelectItem>
              <SelectItem value="BULK_ACTION_SUBMISSIONS">제출물 일괄처리</SelectItem>
              <SelectItem value="CREATE_FEEDBACK">피드백 생성</SelectItem>
              <SelectItem value="DELETE_FEEDBACK">피드백 삭제</SelectItem>
              <SelectItem value="GENERATE_SETTLEMENTS">정산 생성</SelectItem>
              <SelectItem value="COMPLETE_SETTLEMENT">정산 확정</SelectItem>
              <SelectItem value="CANCEL_SETTLEMENT">정산 취소</SelectItem>
              <SelectItem value="DELETE_SETTLEMENT">정산 삭제</SelectItem>
              <SelectItem value="ADJUST_SETTLEMENT_ITEM">정산 항목 조정</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterEntityType} onValueChange={setFilterEntityType}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="엔티티 유형" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value="User">사용자</SelectItem>
              <SelectItem value="ProjectRequest">제작요청</SelectItem>
              <SelectItem value="ProjectAssignment">배정</SelectItem>
              <SelectItem value="Submission">제출물</SelectItem>
              <SelectItem value="Feedback">피드백</SelectItem>
              <SelectItem value="Settlement">정산</SelectItem>
              <SelectItem value="SettlementItem">정산 항목</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="관리자 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-48"
          />
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.3} className="p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ScrollText className="h-10 w-10 opacity-40 mb-3" />
            <p className="font-medium">활동 로그가 없습니다</p>
            <p className="text-xs mt-1">필터를 변경하거나 나중에 다시 확인해주세요.</p>
          </div>
        ) : (
          <div className="relative space-y-0.5">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/50 z-0" />
            
            {logs.map((log: AuditLogEntry, index: number) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                className="relative z-10 flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 border border-transparent hover:border-border/30 transition-all duration-200"
              >
                <div className={cn(
                  "mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-background flex-shrink-0",
                  getActionColor(log.action)
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{log.actor.name}</span>
                    <GlowBadge label={getActionLabel(log.action)} variant={getActionVariant(log.action)} size="sm" />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Intl.DateTimeFormat("ko-KR", { 
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit"
                      }).format(new Date(log.createdAt))}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {log.actor.name}님이 {getEntityLabel(log.entityType)} [{log.entityId.slice(0, 8)}...]을(를) {getActionVerb(log.action)}했습니다
                  </p>
                  
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <ExpandableChanges changes={log.changes} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              이전
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              다음
            </Button>
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}

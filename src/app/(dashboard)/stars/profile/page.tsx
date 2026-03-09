"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  User, Mail, Phone, Banknote, Shield,
  CheckCircle2, AlertCircle, Sparkles,
  ChevronRight, Edit3, Save, X,
  Building2, CreditCard, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
//  TYPES
// ============================================================
type UserData = {
  id: string;
  authId: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  baseRate: number | null;
  bankName: string | null;
  bankAccount: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================
//  HELPERS
// ============================================================
const roleLabels: Record<string, string> = {
  STAR: "크리에이터",
  ADMIN: "관리자",
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(dateStr));
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

// ============================================================
//  PROFILE COMPLETENESS
// ============================================================
interface ProfileField {
  key: string;
  label: string;
  icon: typeof User;
  filled: boolean;
  priority: "required" | "recommended" | "optional";
}

function getProfileFields(data: UserData): ProfileField[] {
  return [
    { key: "name", label: "이름", icon: User, filled: !!data.name, priority: "required" },
    { key: "email", label: "이메일", icon: Mail, filled: !!data.email, priority: "required" },
    { key: "phone", label: "연락처", icon: Phone, filled: !!data.phone, priority: "recommended" },
    { key: "bankName", label: "은행명", icon: Building2, filled: !!data.bankName, priority: "recommended" },
    { key: "bankAccount", label: "계좌번호", icon: CreditCard, filled: !!data.bankAccount, priority: "recommended" },
  ];
}

// ============================================================
//  ONBOARDING BANNER COMPONENT
// ============================================================
function OnboardingBanner({ completeness, missingFields }: { completeness: number; missingFields: string[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || completeness >= 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-5 text-white shadow-lg shadow-violet-500/20"
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTMwIDB2NjBNMCAzMGg2MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold mb-1">프로필을 완성해 주세요! 🚀</h3>
            <p className="text-xs text-white/80 leading-relaxed max-w-md">
              {missingFields.length > 0
                ? `아직 입력하지 않은 항목이 있어요: ${missingFields.join(", ")}. 프로필을 완성하면 정산과 협업이 더 원활해져요!`
                : "프로필 정보를 최신 상태로 유지해 주세요."
              }
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1.5 hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="relative mt-4">
        <div className="h-2 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-white/90 shadow-sm"
          />
        </div>
        <span className="absolute right-0 -top-5 text-[10px] font-bold text-white/80">
          {completeness}% 완성
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================
//  COMPLETENESS RING
// ============================================================
function CompletenessRing({ percentage }: { percentage: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = percentage >= 100 ? "#10b981" : percentage >= 60 ? "#8b5cf6" : "#f59e0b";

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20 dark:text-white/[0.06]" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>
        {percentage}%
      </span>
    </div>
  );
}

// ============================================================
//  MAIN PAGE
// ============================================================
export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editSection, setEditSection] = useState<"basic" | "bank" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) throw new Error("프로필을 불러오지 못했습니다.");
      const json = (await res.json()) as { data: UserData };
      return json.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "프로필 수정에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("프로필이 수정되었습니다.");
      setEditSection(null);
      await queryClient.invalidateQueries({ queryKey: ["user-me"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "프로필 수정에 실패했습니다.");
    },
  });

  // Profile completeness
  const { completeness, fields, missingFields } = useMemo(() => {
    if (!data) return { completeness: 0, fields: [], missingFields: [] };
    const f = getProfileFields(data);
    const filled = f.filter((ff) => ff.filled).length;
    const missing = f.filter((ff) => !ff.filled).map((ff) => ff.label);
    return {
      completeness: Math.round((filled / f.length) * 100),
      fields: f,
      missingFields: missing,
    };
  }, [data]);

  function startEditBasic() {
    if (!data) return;
    setName(data.name);
    setPhone(data.phone ?? "");
    setEditSection("basic");
  }

  function startEditBank() {
    if (!data) return;
    setBankName(data.bankName ?? "");
    setBankAccount(data.bankAccount ?? "");
    setEditSection("bank");
  }

  function handleSaveBasic() {
    updateMutation.mutate({
      name: name.trim() || undefined,
      phone: phone.trim() || null,
    });
  }

  function handleSaveBank() {
    updateMutation.mutate({
      bankName: bankName.trim() || null,
      bankAccount: bankAccount.trim() || null,
    });
  }

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  // Error
  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-10 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-sm text-destructive font-medium">프로필을 불러오지 못했습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">

      {/* Onboarding Banner */}
      <AnimatePresence>
        <OnboardingBanner completeness={completeness} missingFields={missingFields} />
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-violet-500" />
            프로필
          </h1>
          <p className="text-sm text-muted-foreground mt-1">프로필 정보를 확인하고 수정하세요.</p>
        </div>

        <CompletenessRing percentage={completeness} />
      </motion.div>

      {/* Profile Completeness Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border dark:border-white/[0.06] overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" />
              프로필 완성도
            </CardTitle>
            <CardDescription>프로필이 완성될수록 정산과 협업이 원활해집니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    field.filled
                      ? "bg-emerald-500/5 dark:bg-emerald-500/[0.03]"
                      : "bg-amber-500/5 dark:bg-amber-500/[0.03]"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    field.filled
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  )}>
                    {field.filled ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <field.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-medium flex-1",
                    field.filled ? "text-muted-foreground line-through" : "text-foreground dark:text-white"
                  )}>
                    {field.label}
                  </span>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold",
                    field.priority === "required" ? "border-rose-500/30 text-rose-500" :
                      field.priority === "recommended" ? "border-amber-500/30 text-amber-500" :
                        "border-slate-500/30 text-slate-500"
                  )}>
                    {field.priority === "required" ? "필수" : field.priority === "recommended" ? "권장" : "선택"}
                  </Badge>
                  {!field.filled && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Basic Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border dark:border-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                기본 정보
              </CardTitle>
              <CardDescription>계정에 연결된 기본 프로필 정보입니다.</CardDescription>
            </div>
            {editSection !== "basic" && (
              <Button variant="ghost" size="sm" onClick={startEditBasic} className="gap-1.5 text-xs">
                <Edit3 className="w-3.5 h-3.5" />
                수정
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {editSection === "basic" ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">이름</Label>
                    <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">연락처</Label>
                    <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveBasic} disabled={updateMutation.isPending} className="gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      {updateMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditSection(null)}>취소</Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">이름</p>
                    <p className="font-medium text-sm">{data.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">이메일</p>
                    <p className="font-medium text-sm">{data.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">연락처</p>
                    <p className="font-medium text-sm">{data.phone || <span className="text-amber-500">미설정</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">역할</p>
                    <Badge variant="outline">{roleLabels[data.role] ?? data.role}</Badge>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bank Info Card — Self-management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border dark:border-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                정산 정보
              </CardTitle>
              <CardDescription>정산 수령을 위한 은행 정보입니다. 직접 관리할 수 있습니다.</CardDescription>
            </div>
            {editSection !== "bank" && (
              <Button variant="ghost" size="sm" onClick={startEditBank} className="gap-1.5 text-xs">
                <Edit3 className="w-3.5 h-3.5" />
                수정
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {editSection === "bank" ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">은행명</Label>
                    <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 국민은행, 카카오뱅크" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-account">계좌번호</Label>
                    <Input id="bank-account" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="- 없이 숫자만 입력" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveBank} disabled={updateMutation.isPending} className="gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      {updateMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditSection(null)}>취소</Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">은행명</p>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.bankName || <span className="text-amber-500">미설정</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">계좌번호</p>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.bankAccount || <span className="text-amber-500">미설정</span>}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border dark:border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              계정 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {data.baseRate && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">기본 단가</p>
                <p className="font-medium text-sm">{formatAmount(Number(data.baseRate))}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">가입일</p>
              <p className="font-medium text-sm">{formatDate(data.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

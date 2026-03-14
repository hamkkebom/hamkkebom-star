"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, Mail, Phone, Banknote, Shield,
  CheckCircle2, Sparkles, X,
  Building2, CreditCard, Save, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
//  TYPES
// ============================================================
type UserData = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  baseRate: number | null;
};

// ============================================================
//  PROFILE COMPLETENESS
// ============================================================
interface ProfileField {
  key: string;
  label: string;
  icon: typeof User;
  filled: boolean;
  priority: "required" | "recommended";
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
//  ONBOARDING BANNER
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
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold mb-1">프로필을 완성해 주세요! 🚀</h3>
            <p className="text-xs text-white/80 leading-relaxed max-w-md">
              {missingFields.length > 0
                ? `아직 입력하지 않은 항목: ${missingFields.join(", ")}. 완성하면 정산과 협업이 원활해져요!`
                : "프로필 정보를 최신 상태로 유지해 주세요."
              }
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 rounded-lg p-1.5 hover:bg-white/10 transition-colors">
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>
      <div className="relative mt-4">
        <div className="h-2 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-white/90 shadow-sm"
          />
        </div>
        <span className="absolute right-0 -top-5 text-[10px] font-bold text-white/80">{completeness}% 완성</span>
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
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20 dark:text-white/[0.06]" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{percentage}%</span>
    </div>
  );
}

// ============================================================
//  MAIN PAGE
// ============================================================
export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Name change
  const [newName, setNewName] = useState("");
  const [changingName, setChangingName] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [isEmailInputReadOnly, setIsEmailInputReadOnly] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Bank info
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) throw new Error("설정을 불러오지 못했습니다.");
      const json = (await res.json()) as { data: UserData };
      return json.data;
    },
  });

  useEffect(() => {
    if (data?.name) setNewName(data.name);
    if (data) {
      setBankName(data.bankName ?? "");
      setBankAccount(data.bankAccount ?? "");
    }
  }, [data]);

  // Profile completeness
  const { completeness, fields, missingFields } = useMemo(() => {
    if (!data) return { completeness: 0, fields: [] as ProfileField[], missingFields: [] as string[] };
    const f = getProfileFields(data);
    const filled = f.filter((ff) => ff.filled).length;
    const missing = f.filter((ff) => !ff.filled).map((ff) => ff.label);
    return { completeness: Math.round((filled / f.length) * 100), fields: f, missingFields: missing };
  }, [data]);

  // ---- Handlers (기존 유지) ----

  async function handleNameChange() {
    const trimmed = newName.trim();
    if (!trimmed) { toast.error("이름을 입력해주세요."); return; }
    if (trimmed.length < 2) { toast.error("이름은 2자 이상이어야 합니다."); return; }
    if (trimmed === data?.name) { toast.error("현재 이름과 동일합니다."); return; }
    setChangingName(true);
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error?.message || "이름 변경 실패"); }
      toast.success("이름이 변경되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "이름 변경 요청에 실패했습니다."); }
    finally { setChangingName(false); }
  }

  async function handleEmailChangeRequest() {
    const trimmed = newEmail.trim();
    if (!trimmed) { toast.error("새 이메일을 입력해주세요."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast.error("올바른 이메일 형식을 입력해주세요."); return; }
    if (trimmed === data?.email) { toast.error("현재 사용 중인 이메일과 동일합니다."); return; }
    setShowConfirmDialog(true);
  }

  async function handleEmailChangeConfirm() {
    setChangingEmail(true);
    try {
      const res = await fetch("/api/users/email-change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail.trim() }) });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error || "이메일 변경 실패"); }
      toast.success("이메일이 변경되었습니다. 다시 로그인해주세요.", { duration: 5000 });
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    } catch (err) { toast.error(err instanceof Error ? err.message : "이메일 변경 요청에 실패했습니다."); }
    finally { setChangingEmail(false); setShowConfirmDialog(false); }
  }

  async function handlePasswordChange() {
    if (!newPassword.trim()) { toast.error("새 비밀번호를 입력해주세요."); return; }
    if (newPassword.length < 6) { toast.error("비밀번호는 6자 이상이어야 합니다."); return; }
    if (newPassword !== confirmPassword) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("비밀번호가 변경되었습니다.");
      setNewPassword(""); setConfirmPassword("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다."); }
    finally { setChangingPassword(false); }
  }

  async function handleBankSave() {
    setSavingBank(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: bankName.trim() || null,
          bankAccount: bankAccount.trim() || null,
        }),
      });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error?.message || "저장 실패"); }
      toast.success("정산 정보가 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "정산 정보 저장에 실패했습니다."); }
    finally { setSavingBank(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">

      {/* ===== ONBOARDING BANNER ===== */}
      <AnimatePresence>
        {!isLoading && <OnboardingBanner completeness={completeness} missingFields={missingFields} />}
      </AnimatePresence>

      {/* ===== HEADER ===== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">설정</h1>
          <p className="text-sm text-muted-foreground">계정 및 보안 설정을 관리하세요.</p>
        </div>
        {!isLoading && <CompletenessRing percentage={completeness} />}
      </motion.div>

      {/* ===== PROFILE COMPLETENESS ===== */}
      {!isLoading && completeness < 100 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" />
                프로필 완성도
              </CardTitle>
              <CardDescription>프로필을 완성하면 정산과 협업이 원활해집니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.key} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    field.filled ? "bg-emerald-500/5 dark:bg-emerald-500/[0.03]" : "bg-amber-500/5 dark:bg-amber-500/[0.03]"
                  )}>
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      field.filled ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {field.filled ? <CheckCircle2 className="w-4 h-4" /> : <field.icon className="w-4 h-4" />}
                    </div>
                    <span className={cn("text-sm font-medium flex-1",
                      field.filled ? "text-muted-foreground line-through" : "text-foreground dark:text-white"
                    )}>{field.label}</span>
                    <Badge variant="outline" className={cn("text-[10px] font-bold",
                      field.priority === "required" ? "border-rose-500/30 text-rose-500" : "border-amber-500/30 text-amber-500"
                    )}>
                      {field.priority === "required" ? "필수" : "권장"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== 계정 정보 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 정보</CardTitle>
          <CardDescription>현재 로그인된 계정 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-32" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-sm text-muted-foreground">이메일</p><p className="font-medium">{data?.email ?? "-"}</p></div>
              <div><p className="text-sm text-muted-foreground">이름</p><p className="font-medium">{data?.name ?? "-"}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 정산 정보 (은행) — NEW ===== */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-emerald-500/20 dark:border-emerald-500/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-500" />
              정산 정보
            </CardTitle>
            <CardDescription>정산 수령을 위한 은행 정보입니다. 직접 관리할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bank-name" className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  은행명
                </Label>
                <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 국민은행, 카카오뱅크" disabled={savingBank} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-account" className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  계좌번호
                </Label>
                <Input id="bank-account" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="- 없이 숫자만 입력" disabled={savingBank} />
              </div>
            </div>
            <Button
              size="lg"
              className="w-full sm:w-auto mt-2 font-bold active:scale-95 transition-all h-12 sm:h-auto gap-1.5"
              onClick={handleBankSave}
              disabled={savingBank || (bankName === (data?.bankName ?? "") && bankAccount === (data?.bankAccount ?? ""))}
            >
              <Save className="w-4 h-4" />
              {savingBank ? "저장 중..." : "정산 정보 저장"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== 이름 변경 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이름 변경</CardTitle>
          <CardDescription>표시될 이름을 변경합니다. (최소 2자 이상)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-name-input">새 이름</Label>
            <Input id="change-name-input" name="change-name-input" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="홍길동" disabled={changingName} />
          </div>
          <Button size="lg" className="w-full sm:w-auto mt-2 font-bold active:scale-95 transition-all h-12 sm:h-auto" onClick={handleNameChange} disabled={changingName || !newName.trim() || newName.trim() === data?.name}>
            {changingName ? "변경 중..." : "이름 변경"}
          </Button>
        </CardContent>
      </Card>

      {/* ===== 이메일 변경 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이메일 변경</CardTitle>
          <CardDescription>새 이메일 주소를 입력하고 변경하면 <strong>즉시 변경</strong>됩니다. (자동으로 로그아웃됨)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-email-input">새 이메일</Label>
            <Input id="change-email-input" name="change-email-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@example.com" autoComplete="new-password" disabled={changingEmail} readOnly={isEmailInputReadOnly} onFocus={() => setIsEmailInputReadOnly(false)} />
          </div>
          <Button size="lg" className="w-full sm:w-auto mt-2 font-bold active:scale-95 transition-all h-12 sm:h-auto" onClick={handleEmailChangeRequest} disabled={changingEmail || !newEmail.trim()}>
            {changingEmail ? "요청 중..." : "이메일 변경"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이메일 주소를 변경하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이메일을 <span className="font-bold text-foreground">{newEmail}</span>(으)로 변경합니다.
              <br />변경 후에는 <strong>자동으로 로그아웃</strong>되며, 새 이메일로 다시 로그인해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmailChangeConfirm}>변경하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== 비밀번호 변경 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비밀번호 변경</CardTitle>
          <CardDescription>보안을 위해 주기적으로 비밀번호를 변경하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6자 이상" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">비밀번호 확인</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 다시 입력" />
          </div>
          <Button size="lg" className="w-full sm:w-auto mt-2 font-bold active:scale-95 transition-all h-12 sm:h-auto" onClick={handlePasswordChange} disabled={changingPassword}>
            {changingPassword ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </CardContent>
      </Card>

      {/* ===== 로그아웃 ===== */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-orange-500/20 dark:border-orange-500/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LogOut className="w-4 h-4 text-orange-500" />
              로그아웃
            </CardTitle>
            <CardDescription>
              현재 기기에서 로그아웃합니다. 다시 이메일/비밀번호로 로그인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 sm:h-auto font-bold border-orange-500/30 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 active:scale-95 transition-all gap-2"
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await supabase.auth.signOut();
                  window.location.href = "/auth/login";
                } catch {
                  toast.error("로그아웃에 실패했습니다.");
                  setLoggingOut(false);
                }
              }}
              disabled={loggingOut}
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== 위험 구역 ===== */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">위험 구역</CardTitle>
          <CardDescription>계정 삭제는 되돌릴 수 없으며, 모든 데이터가 삭제됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">계정 삭제를 원하시면 관리자에게 문의해 주세요.</p>
          <Button variant="destructive" size="lg" className="w-full sm:w-auto h-12 sm:h-auto font-bold" disabled>
            계정 삭제 요청 (관리자 문의)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

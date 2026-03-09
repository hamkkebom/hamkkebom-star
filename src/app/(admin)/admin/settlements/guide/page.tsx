import Image from "next/image";
import {
    Wallet,
    PlayCircle,
    FileText,
    CheckCircle2,
    DollarSign,
    AlertTriangle,
    Lightbulb,
    MousePointerClick,
    Info
} from "lucide-react";

export default function SettlementGuidePage() {
    return (
        <div className="flex-1 bg-background relative md:p-6 lg:p-10 h-[calc(100vh-64px)] md:h-auto overflow-hidden md:overflow-visible">
            <div className="max-w-4xl mx-auto h-full md:pb-20">

                {/* Mobile E-Book Wrapper */}
                <div className="flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory h-full w-full md:flex-col md:overflow-visible md:snap-none md:h-auto md:space-y-16 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* Page 1: Intro */}
                    <div className="w-[100vw] md:w-auto shrink-0 snap-center h-full flex flex-col justify-center p-8 md:p-0 md:block max-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24 md:pb-0">
                        <div className="space-y-6 md:space-y-4 max-w-lg mx-auto md:max-w-none text-center md:text-left">
                            <div className="inline-flex items-center justify-center rounded-3xl bg-amber-500/10 px-4 py-1.5 border border-amber-500/20">
                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">관리자 가이드</span>
                            </div>
                            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-foreground mt-2 leading-tight">
                                정산 관리 시스템<br className="md:hidden" /> 완벽 가이드
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed md:max-w-3xl">
                                별들에게 물어봐의 정산 시스템은 승인된 영상 제출물을 기준으로 자동으로 계산되며,
                                관리자가 예외 단가를 유연하게 제어할 수 있도록 설계되었습니다.
                                스와이프하여 가이드를 확인해보세요.
                            </p>
                            <div className="md:hidden mt-8 flex justify-center text-muted-foreground animate-bounce">
                                <span className="text-sm font-bold flex items-center gap-2">스와이프하여 넘기기 <span className="text-lg">→</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Page 2: Priority */}
                    <div className="w-[100vw] md:w-auto shrink-0 snap-center h-full flex flex-col justify-center p-8 md:p-0 md:block max-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24 md:pb-0">
                        <section className="space-y-6 max-w-lg mx-auto md:max-w-none">
                            <div className="flex items-center gap-3 justify-center md:justify-start">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                                    <span className="font-bold text-violet-600 dark:text-violet-400 text-lg">1</span>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">단가 적용 우선순위</h2>
                            </div>
                            <div className="md:pl-12 space-y-4">
                                <p className="text-base text-muted-foreground text-center md:text-left">
                                    시스템은 총 3가지 단가를 확인하며, <strong className="text-foreground">가장 높은 우선순위의 단가 1개만 적용</strong>합니다.
                                </p>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border bg-card p-5 space-y-3 relative overflow-hidden group shadow-md hover:shadow-lg transition-all">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg">1. 영상 개별 단가</h3>
                                            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                최우선
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            정산 상세 창에서 관리자가 직접 입력하는 특별 예외 단가입니다.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-card p-5 space-y-3 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-violet-400/50" />
                                        <h3 className="font-bold text-lg text-muted-foreground/80">2. STAR 개인 단가</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            특정 STAR 지정 고정 단가 (설정: STAR 단가 관리)
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-card p-5 space-y-3 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/50" />
                                        <h3 className="font-bold text-lg text-muted-foreground/80">3. 등급 기본 단가</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            STAR 등급(A, B, C)에 따른 일괄 기본 적용 단가
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Page 3: Flow Step 1 */}
                    <div className="w-[100vw] md:w-auto shrink-0 snap-center h-full flex flex-col justify-center p-8 md:p-0 md:block max-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24 md:pb-0">
                        <section className="space-y-6 max-w-lg mx-auto md:max-w-none">
                            <div className="flex items-center gap-3 justify-center md:justify-start">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">2</span>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">전체 정산 진행 사이클</h2>
                            </div>

                            <div className="md:pl-12">
                                <div className="overflow-hidden rounded-3xl border bg-card shadow-lg">
                                    <div className="relative aspect-[4/3] md:aspect-[2/1] w-full bg-slate-100 dark:bg-slate-900">
                                        <Image
                                            src="/images/admin-guide/settlement_flow_1.png"
                                            alt="정산 생성 화면 예시"
                                            fill
                                            className="object-cover opacity-90 transition-opacity hover:opacity-100"
                                        />
                                    </div>
                                    <div className="p-6 md:p-8 space-y-4">
                                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">1단계: 정산 생성</h3>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            가장 먼저 시작일과 종료일을 선택해 일괄 정산을 내립니다. <strong className="text-foreground">승인된 결과물만</strong> 반영됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Page 4: Flow Step 2 */}
                    <div className="w-[100vw] md:w-auto shrink-0 snap-center h-full flex flex-col justify-center p-8 md:p-0 md:block max-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24 md:pb-0">
                        <section className="space-y-6 md:mt-0 max-w-lg mx-auto md:max-w-none md:pl-12">
                            <div className="overflow-hidden rounded-3xl border bg-card shadow-lg">
                                <div className="relative aspect-[4/3] md:aspect-[2/1] w-full bg-slate-100 dark:bg-slate-900">
                                    <Image
                                        src="/images/admin-guide/custom_rate_1.png"
                                        alt="정산 상세 및 영상 단가 설정 UI 예시"
                                        fill
                                        className="object-cover opacity-90 transition-opacity hover:opacity-100"
                                    />
                                </div>
                                <div className="p-6 md:p-8 space-y-4">
                                    <h3 className="text-2xl font-black text-amber-500">2단계: 영상 개별 단가 조정</h3>
                                    <p className="text-lg text-muted-foreground">
                                        작업 난이도가 높았던 영상에 추가 금액이 있나요? 목록을 눌러 상세 정보를 연 뒤 개별 단가를 입력하세요.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Page 5: Flow Step 3 */}
                    <div className="w-[100vw] md:w-auto shrink-0 snap-center h-full flex flex-col justify-center p-8 md:p-0 md:block max-h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24 md:pb-0">
                        <section className="space-y-6 md:mt-0 max-w-lg mx-auto md:max-w-none md:pl-12">
                            <div className="rounded-3xl border bg-card shadow-lg p-8 md:p-10 flex flex-col items-center md:items-start text-center md:text-left space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 dark:bg-rose-500/20 rounded-bl-[100px]" />
                                <CheckCircle2 className="h-16 w-16 text-rose-500" />
                                <div className="space-y-4 z-10 w-full">
                                    <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400">3단계: 정산 확정</h3>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        금액 검토가 완료되었다면 목록에서 상태를 <strong className="text-foreground">확정 (Completed)</strong>으로 바꿉니다. 확정된 내역은 잠금 처리되어 단가를 임의로 바꿀 수 없습니다.
                                    </p>
                                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 flex gap-3 text-left">
                                        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            확정 이후에는 Excel 다운로드 기능을 이용하여 재무 부서에 전달하거나 보관할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                </div>

                {/* Mobile E-Book Page Indicator */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 md:hidden z-10 bg-slate-900/40 dark:bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full pointer-events-none shadow-xl border border-white/10">
                    <span className="text-xs font-bold text-white tracking-widest uppercase">Swipe to read</span>
                </div>

            </div>
        </div>
    );
}

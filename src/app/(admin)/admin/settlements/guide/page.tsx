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
        <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-10 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-12 pb-20">

                {/* Header */}
                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center rounded-3xl bg-amber-500/10 px-4 py-1.5 border border-amber-500/20">
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">관리자 가이드</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-foreground mt-2">
                        정산 관리 시스템 완벽 가이드
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                        함케봄스타의 정산 시스템은 승인된 영상 제출물을 기준으로 자동으로 계산되며,
                        관리자가 예외 단가를 유연하게 제어할 수 있도록 설계되었습니다.
                        아래 가이드를 따라 안전하고 정확하게 정산을 처리해보세요.
                    </p>
                </div>

                {/* Section 1: 단가 우선순위 */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                            <span className="font-bold text-violet-600 dark:text-violet-400 text-lg">1</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">단가 적용 우선순위</h2>
                    </div>
                    <div className="pl-0 md:pl-12 space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground">
                            정산 시 금액은 자동으로 계산됩니다. 시스템은 총 3가지 단가를 확인하며, <strong className="text-foreground">가장 높은 우선순위의 단가 1개만 적용</strong>합니다.
                        </p>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border bg-card p-5 space-y-3 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg">1. 영상 개별 단가</h3>
                                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        최우선
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    특정 영상(작품)에만 특별히 적용하는 단가입니다. 정산 상세 창에서 관리자가 직접 입력합니다.
                                </p>
                            </div>

                            <div className="rounded-2xl border bg-card p-5 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-violet-400/50" />
                                <h3 className="font-bold text-lg text-muted-foreground/80">2. STAR 개인 단가</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    특정 STAR에게만 고정적으로 적용하는 단가입니다. STAR 단가 관리 페이지에서 설정합니다.
                                </p>
                            </div>

                            <div className="rounded-2xl border bg-card p-5 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/50" />
                                <h3 className="font-bold text-lg text-muted-foreground/80">3. 등급 기본 단가</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    STAR가 속한 등급(A, B, C 등)에 적용되는 일괄 기본 단가입니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: 플로우 */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">2</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">전체 정산 진행 사이클</h2>
                    </div>

                    <div className="pl-0 md:pl-12 space-y-6 md:space-y-8">
                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                            <div className="relative aspect-[16/10] md:aspect-[2/1] w-full bg-muted/30">
                                <Image
                                    src="/images/admin-guide/settlement_flow_1.png"
                                    alt="정산 생성 화면 예시"
                                    fill
                                    className="object-cover opacity-90 transition-opacity hover:opacity-100"
                                />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-2">1단계: 월별 정산 생성</h3>
                                <p className="text-muted-foreground mb-4">
                                    매월 초, 지난달 작업물에 대한 정산을 일괄 생성합니다.
                                    <strong className="text-foreground"> 피드백 완료(승인)된 제출물만</strong> 대상이 됩니다.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <MousePointerClick className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <span><strong className="text-foreground">수행 방법:</strong> 우측 상단의 <strong className="text-purple-500">정산 생성</strong> 버튼 클릭 &gt; 연도와 월 선택 &gt; 확인</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Info className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                                        <span><strong className="text-foreground">안전한 재생성:</strong> 이미 "확정(COMPLETED)"된 건은 건드리지 않으며, 진행 중인 건만 최신 정보(단가, 새로운 승인 내역)를 반영해 새로고침합니다.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                            <div className="relative aspect-[16/10] md:aspect-[2/1] w-full bg-muted/30">
                                <Image
                                    src="/images/admin-guide/custom_rate_1.png"
                                    alt="정산 상세 및 영상 단가 설정 UI 예시"
                                    fill
                                    className="object-cover opacity-90 transition-opacity hover:opacity-100"
                                />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-2">2단계: 예외 단가(영상 단가) 조정</h3>
                                <p className="text-muted-foreground mb-4">
                                    유독 작업 난이도가 높았거나 수고비가 추가되어야 하는 경우, 해당 영상에만 예외 단가를 적용합니다.
                                </p>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 space-y-3">
                                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        영상 개별 단가 적용 방법
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
                                        <li>목록에서 정산 카드를 클릭하여 <strong>상세 보기</strong> 창 오픈</li>
                                        <li>정산 항목에서 <strong className="text-amber-600 dark:text-amber-300">영상 단가 뱃지</strong> 또는 빈 칸이 있는 입력 필드 확인</li>
                                        <li>예외로 적용할 <strong>금액(숫자만) 입력 후 [저장]</strong> 클릭 (예: 80,000)</li>
                                        <li>상세 창을 닫고, 메인 화면 우측 상단의 <strong>[정산 생성]</strong> 버튼을 다시 한 번 클릭!</li>
                                    </ol>
                                    <p className="text-xs mt-2 text-amber-600/80 dark:text-amber-500 font-medium">
                                        * 영상 단가를 지우고 빈 칸으로 저장한 뒤 다시 "정산 생성"을 누르면 기본 단가로 복구됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-card shadow-sm p-5 md:p-6">
                            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                3단계: 정산 확정
                            </h3>
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                                금액 검토가 완료되었다면 상태를 '확정'으로 변경합니다.
                                확정된 정산은 <strong className="text-foreground">잠금 처리</strong>되어 어떠한 이유로도(단가 변경, 재생성 등) 금액이 변동되지 않습니다.
                            </p>
                            <div className="flex items-center gap-2 text-sm font-medium bg-muted p-3 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                확정 후에는 삭제할 수 없으며, PDF 다운로드를 통해 재무 부서에 전달할 수 있습니다.
                            </div>
                        </div>

                    </div>
                </section>

            </div>
        </div>
    );
}

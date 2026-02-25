import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Sparkles, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUpdatesPage() {
    const user = await getAuthUser();

    if (!user || user.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const updates = [
        {
            date: "2026-02-25",
            version: "Feature Update",
            title: "영상 관리 페이지 대규모 개선",
            items: [
                "정렬 기능 추가: 최신순 / 오래된순으로 영상을 정렬할 수 있습니다.",
                "카테고리 필터: 드롭다운으로 특정 카테고리의 영상만 빠르게 필터링할 수 있습니다.",
                "작성자 검색: 한글 이름 또는 닉네임으로 영상 소유자를 검색할 수 있습니다.",
                "기간별 조회: 달력 UI를 통해 시작일~종료일을 설정하여 해당 기간 내 등록된 영상만 조회할 수 있습니다.",
                "상세보기 버튼: 각 영상의 최신 제출물 피드백 페이지로 바로 이동할 수 있는 '상세보기' 버튼이 추가되었습니다.",
                "페이지네이션 개선: 숫자 페이지 버튼(최대 8개)으로 원하는 페이지를 직접 선택할 수 있도록 업그레이드되었습니다.",
            ]
        },
        {
            date: "2026-02-24",
            version: "Feature Update",
            title: "새로운 기능: 원본 영상 다운로드",
            items: [
                "제출된 영상을 관리자 PC에 바로 저장할 수 있는 '영상 다운로드' 버튼이 추가되었습니다.",
                "이제 피드백 관리 페이지에서 별도의 복잡한 과정 없이 버튼 클릭 한 번으로 고화질 원본 영상을 빠르고 안전하게 받아보실 수 있습니다.",
            ]
        },
        {
            date: "2026-02-24",
            version: "Feature Update",
            title: "신규 기능 추가: 프로젝트 승인 관리",
            items: [
                "STAR가 참여 신청한 프로젝트 목록을 확인할 수 있는 '승인 대기 목록' 기능 도입",
                "운영진이 신청 내역(STAR 정보, 신청 일자 등)을 검토 후 즉각적으로 '승인' 또는 '거절'을 처리할 수 있는 직관적인 UI 제공",
                "결과가 지연 없이 반영되도록 최적화된 시스템 적용 (낙관적 UI 업데이트)",
            ]
        }
    ];

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">시스템 업데이트 노트</h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    최근 개발 및 패치된 시스템 변경 사항을 관리자분들께 안내해 드립니다.
                </p>
            </div>

            <div className="space-y-8">
                {updates.map((update, idx) => (
                    <div key={idx} className="relative pl-6 pb-6 border-l-2 border-muted last:border-0 last:pb-0">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-background bg-amber-500 shadow-sm" />

                        <div className="mb-1 flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">{update.version}</span>
                            <span className="text-xs font-medium text-muted-foreground">{update.date}</span>
                        </div>

                        <h2 className="mb-4 text-base font-medium text-foreground">{update.title}</h2>

                        <ul className="space-y-2.5 mb-6">
                            {update.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="flex gap-2.5 text-sm text-muted-foreground/90">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/70" />
                                    <span className="leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

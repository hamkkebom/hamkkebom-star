import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

type UpdateType = "NEW" | "IMPROVE" | "FIX";

interface UpdateEntry {
  date: string;
  title: string;
  description: string;
  type: UpdateType;
}

const updates: UpdateEntry[] = [
  {
    date: "2026-03-10",
    title: "커뮤니티 게시판 리디자인",
    description: "커뮤니티 게시판의 UI를 전면 개편하여 가독성을 높이고 모바일 사용성을 개선했습니다.",
    type: "NEW",
  },
  {
    date: "2026-03-08",
    title: "영상 다운로드 안정성 개선",
    description: "대용량 영상 다운로드 시 간헐적으로 발생하던 끊김 현상을 해결하고 속도를 최적화했습니다.",
    type: "IMPROVE",
  },
  {
    date: "2026-03-05",
    title: "모바일 스와이프 리뷰 도입",
    description: "모바일 환경에서 영상을 스와이프하여 빠르게 리뷰하고 피드백을 남길 수 있는 기능을 추가했습니다.",
    type: "NEW",
  },
  {
    date: "2026-03-01",
    title: "공개 페이지 전면 리뉴얼",
    description: "함께봄스타의 브랜드 아이덴티티를 반영하여 메인 페이지와 소개 페이지를 새롭게 단장했습니다.",
    type: "NEW",
  },
  {
    date: "2026-02-25",
    title: "실시간 알림 시스템 추가",
    description: "프로젝트 배정, 피드백 등록, 정산 완료 등 중요 이벤트를 실시간 푸시 알림으로 받아볼 수 있습니다.",
    type: "NEW",
  },
  {
    date: "2026-02-20",
    title: "AI 영상 분석 기능 출시",
    description: "업로드된 영상의 화질, 오디오 레벨, 화면 비율 등을 AI가 자동 분석하여 리포트를 제공합니다.",
    type: "NEW",
  },
  {
    date: "2026-02-15",
    title: "정산 시스템 자동화",
    description: "매월 수동으로 진행되던 정산 프로세스를 자동화하여 더 빠르고 정확한 정산이 가능해졌습니다.",
    type: "IMPROVE",
  },
];

const getTypeColor = (type: UpdateType) => {
  switch (type) {
    case "NEW":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
    case "IMPROVE":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900";
    case "FIX":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900";
  }
};

export default function UpdatesPage() {
  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] pb-20 md:pb-24 bg-background">
      {/* Header */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 bg-gradient-to-b from-violet-500/5 to-background border-b border-border/50">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            업데이트 노트
          </h1>
          <p className="text-muted-foreground text-lg">
            함께봄스타의 최신 변경사항을 확인하세요
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 md:py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Line (Desktop) */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />
          
          {/* Vertical Line (Mobile) */}
          <div className="md:hidden absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-8 md:space-y-16">
            {updates.map((update, i) => (
              <div
                key={i}
                className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0 ${
                  i % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Dot Marker */}
                <div className="absolute left-6 md:left-1/2 w-4 h-4 rounded-full bg-violet-500 border-4 border-background -translate-x-1/2 mt-6 md:mt-0 z-10 shadow-sm" />

                {/* Content Card */}
                <div className={`w-full md:w-1/2 pl-14 md:pl-0 ${i % 2 === 0 ? "md:pl-12" : "md:pr-12"}`}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={`font-bold ${getTypeColor(update.type)}`}>
                          {update.type}
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground font-medium">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          {update.date}
                        </div>
                      </div>
                      <CardTitle className="text-xl leading-tight">{update.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {update.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

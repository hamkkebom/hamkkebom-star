import { Info, MoreVertical } from "lucide-react";
import { SubmissionList } from "@/components/video/submission-list";

export default function MyVideosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">내 영상 관리</h1>
        <p className="text-sm text-muted-foreground">
          업로드한 영상의 상태와 피드백을 확인하세요.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 text-sm text-amber-900/80 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200/80 transition-all hover:bg-amber-50/80 dark:hover:bg-amber-950/40">
        <Info className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-amber-700 dark:text-amber-400">영상 삭제 가이드</p>
          <p className="leading-relaxed">
            아직 <span className="font-semibold text-amber-600 dark:text-amber-300">대기중(Pending)</span> 상태인 영상은 카드 우측의
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-amber-100 dark:bg-amber-900/50 align-middle mx-1"><MoreVertical className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" /></span>
            아이콘을 눌러 삭제할 수 있습니다.
            <br />
            <span className="text-xs text-amber-700/60 dark:text-amber-400/60 block mt-1.5">* 이미 리뷰가 시작된 영상은 소중한 피드백 기록을 위해 삭제가 제한됩니다.</span>
          </p>
        </div>
      </div>

      <SubmissionList />
    </div>
  );
}

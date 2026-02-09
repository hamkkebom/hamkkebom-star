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

      <SubmissionList />
    </div>
  );
}

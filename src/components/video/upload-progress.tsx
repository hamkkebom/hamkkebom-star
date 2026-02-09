"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

type UploadStatus = "requesting" | "uploading" | "submitting" | "done" | "error";

interface UploadProgressProps {
  status: UploadStatus;
  progress: number;
  fileName: string;
}

const statusMessages: Record<UploadStatus, string> = {
  requesting: "업로드 URL 발급 중...",
  uploading: "영상 업로드 중...",
  submitting: "제출물 등록 중...",
  done: "업로드 완료!",
  error: "업로드 실패",
};

export function UploadProgress({ status, progress, fileName }: UploadProgressProps) {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">{statusMessages[status]}</p>
          </div>
          {status === "uploading" && (
            <span className="text-sm font-semibold tabular-nums">{progress}%</span>
          )}
          {status === "done" && (
            <span className="text-sm font-semibold text-green-600">✓</span>
          )}
        </div>

        <Progress
          value={
            status === "requesting"
              ? undefined
              : status === "submitting"
                ? 100
                : progress
          }
          className="h-2"
        />
      </CardContent>
    </Card>
  );
}

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
  const isUploading = status === "uploading";
  const isDone = status === "done";

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="space-y-4 p-0 sm:py-6 relative">
        <div className="bg-card border-2 border-primary/20 rounded-[1.25rem] sm:rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          {isUploading && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent animate-shimmer pointer-events-none" />
          )}

          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <p className="truncate text-base sm:text-lg font-bold text-foreground">{fileName}</p>
                <div className="flex items-center gap-2">
                  {!isDone && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  )}
                  <p className="text-xs sm:text-sm text-primary font-semibold">{statusMessages[status]}</p>
                </div>
              </div>

              {isUploading && (
                <div className="bg-primary/10 text-primary font-black text-lg sm:text-xl rounded-xl px-3 py-1 ml-4 shadow-sm">
                  {progress}%
                </div>
              )}
              {isDone && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-scale-in">
                  <span className="text-xl sm:text-2xl font-bold text-white">✓</span>
                </div>
              )}
            </div>

            <Progress
              value={status === "requesting" ? undefined : status === "submitting" ? 100 : progress}
              className="h-3 sm:h-4 rounded-full bg-primary/10"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

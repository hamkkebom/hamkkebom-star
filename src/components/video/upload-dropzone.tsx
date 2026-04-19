"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/components/video/upload-progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UploadStatus =
  | "idle"
  | "requesting"
  | "uploading"
  | "uploaded"
  | "submitting"
  | "done"
  | "error";

interface UploadDropzoneProps {
  assignmentId: string;
  versionSlot: number;
  versionTitle?: string;
  description?: string;
  lyrics?: string;
  categoryId?: string;
  videoSubject?: "COUNSELOR" | "BRAND" | "OTHER";
  counselorId?: string;
  externalId?: string;
  thumbnailFile?: File | null;
  onComplete?: () => void;
  mode?: "submission" | "upload-only";
  onUploadSuccess?: (streamUid: string) => void;
}

export function UploadDropzone({
  assignmentId,
  versionSlot,
  versionTitle,
  description,
  lyrics,
  categoryId,
  videoSubject,
  counselorId,
  externalId,
  thumbnailFile,
  onComplete,
  mode = "submission",
  onUploadSuccess,
}: UploadDropzoneProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [streamUid, setStreamUid] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** 파일 업로드만 수행 (제출은 별도) */
  const handleUpload = useCallback(
    async (file: File) => {
      // 허용 MIME 타입 체크
      const allowedTypes = [
        "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
        "video/x-matroska", "video/mpeg", "video/x-ms-wmv", "video/x-flv",
      ];
      if (!file.type.startsWith("video/") && !allowedTypes.includes(file.type)) {
        toast.error("영상 파일만 업로드할 수 있습니다.", {
          description: "지원 형식: MP4, MOV, WebM, AVI, MKV, MPEG",
        });
        return;
      }

      // 최대 파일 크기 (5GB)
      if (file.size > 5 * 1024 * 1024 * 1024) {
        const sizeMB = Math.round(file.size / (1024 * 1024));
        toast.error(`파일 크기가 너무 큽니다 (${sizeMB}MB)`, {
          description: "최대 5GB까지 업로드할 수 있습니다.",
        });
        return;
      }

      // 최소 파일 크기 (100KB — 손상된 파일 방지)
      if (file.size < 100 * 1024) {
        toast.error("파일이 너무 작습니다.", {
          description: "유효한 영상 파일인지 확인해주세요.",
        });
        return;
      }

      setFileName(file.name);
      setStatus("requesting");
      setProgress(0);
      setStreamUid(null);

      try {
        // 1. 업로드 URL 발급
        const urlResponse = await fetch("/api/submissions/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxDurationSeconds: 3600 }),
        });

        if (!urlResponse.ok) {
          throw new Error("업로드 URL 발급에 실패했습니다.");
        }

        const { data: urlData } = (await urlResponse.json()) as {
          data: { uploadUrl: string; uid: string };
        };

        // 2. 파일 업로드 (XHR for progress)
        setStatus("uploading");

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", urlData.uploadUrl, true);

          const formData = new FormData();
          formData.append("file", file);

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`업로드 실패: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("업로드 중 네트워크 오류")),
          );
          xhr.send(formData);
        });

        // 업로드 완료 — 제출 대기 상태로 전환
        setStreamUid(urlData.uid);
        setStatus("uploaded");
        setProgress(100);
      } catch (error) {
        setStatus("error");
        toast.error(
          error instanceof Error ? error.message : "업로드에 실패했습니다.",
        );
      }
    },
    [],
  );

  /** 제출 버튼 클릭 시 — 썸네일 업로드 + 제출물 등록 API 호출 */
  const handleSubmit = useCallback(async () => {
    if (!streamUid) return;

    // upload-only 모드면 부모에게 streamUid만 넘기고 종료
    if (mode === "upload-only" && onUploadSuccess) {
      onUploadSuccess(streamUid);
      return;
    }

    setStatus("submitting");

    try {
      // 썸네일 파일이 있으면 제출 시점에 R2로 업로드
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("file", thumbnailFile);

        const uploadRes = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const { data } = await uploadRes.json();
          thumbnailUrl = data?.publicUrl;
          if (!thumbnailUrl) {
            throw new Error("썸네일 업로드 응답에 URL이 없습니다. 관리자에게 문의해주세요.");
          }
        } else {
          // ⚠️ 조용한 실패 제거 — 유저가 썸네일을 의도적으로 올렸는데
          //    무시되면 결국 CF Stream 자동 캡쳐가 표시됨.
          //    명시적으로 에러 노출하고 제출 차단.
          let detail = "";
          try {
            const errJson = await uploadRes.json();
            detail = errJson?.error?.message || "";
          } catch { /* ignore parse error */ }
          throw new Error(
            detail
              ? `썸네일 업로드 실패: ${detail}`
              : `썸네일 업로드 실패 (HTTP ${uploadRes.status}). 이미지 파일을 확인하고 다시 시도해주세요.`,
          );
        }
      }

      const submitResponse = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          versionSlot,
          versionTitle: versionTitle,
          description: description || undefined,
          lyrics: lyrics || undefined,
          categoryId: categoryId || undefined,
          videoSubject,
          counselorId: counselorId || undefined,
          externalId: externalId || undefined,
          thumbnailUrl,
          streamUid,
        }),
      });

      if (!submitResponse.ok) {
        const errData = (await submitResponse.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          errData.error?.message ?? "제출물 등록에 실패했습니다.",
        );
      }

      setStatus("done");
      setShowCompleteDialog(true);

      // 제출 성공 — 관련 React Query 캐시 무효화하여 리스트/상세가 최신 썸네일 반영
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["active-projects"] });
      queryClient.invalidateQueries({ queryKey: ["submissions-my"] });
    } catch (error) {
      setStatus("error");
      toast.error(
        error instanceof Error ? error.message : "제출에 실패했습니다.",
      );
    }
  }, [assignmentId, versionSlot, versionTitle, description, lyrics, categoryId, videoSubject, counselorId, externalId, thumbnailFile, streamUid, mode, onUploadSuccess, queryClient]);

  /** 팝업 확인 → 폼 초기화 */
  const handleDialogConfirm = useCallback(() => {
    setShowCompleteDialog(false);
    setStatus("idle");
    setProgress(0);
    setFileName("");
    setStreamUid(null);
    onComplete?.();
  }, [onComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  // 업로드 진행 중 상태
  if (status === "requesting" || status === "uploading" || status === "submitting") {
    return (
      <UploadProgress status={status} progress={progress} fileName={fileName} />
    );
  }

  // 업로드 완료 → 제출 대기 상태
  if (status === "uploaded" || status === "done") {
    return (
      <>
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="space-y-5 p-0 sm:py-6">
            <div className="flex items-center justify-between bg-muted/30 p-4 sm:p-5 rounded-2xl border border-border/50">
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <p className="truncate text-sm sm:text-base font-bold">{fileName}</p>
                <p className="text-[10px] sm:text-xs text-green-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  영상이 성공적으로 준비되었습니다
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 ml-3">
                <span className="text-sm sm:text-base font-bold text-green-600">✓</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full h-12 sm:h-14 text-base sm:text-lg rounded-xl sm:rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
              onClick={handleSubmit}
              disabled={status === "done"}
            >
              {status === "done" ? "제출 완료 🎉" : "이 영상으로 제출하기 🚀"}
            </Button>
          </CardContent>
        </Card>
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>업로드 완료</DialogTitle>
              <DialogDescription>
                영상이 업로드 되었습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleDialogConfirm}>
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card
      className="cursor-pointer border-2 border-dashed bg-card/50 hover:bg-muted/20 transition-all duration-300 hover:border-primary/60 active:scale-[0.98] rounded-2xl sm:rounded-3xl overflow-hidden group"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 sm:py-20 relative px-4">
        {/* Hover Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="rounded-full bg-primary/10 p-5 sm:p-6 text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300 shadow-sm relative">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 sm:h-10 sm:w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div className="text-center space-y-2 z-10">
          <p className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            눌러서 영상 파일 선택하기
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground/80 font-medium">
            또는 이 영역으로 파일을 드래그하세요
          </p>
        </div>
        <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground/60 font-semibold bg-muted/40 px-3 py-1.5 rounded-full z-10">
          MP4, MOV, WebM 등 • 최대 5GB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}

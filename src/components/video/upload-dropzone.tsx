"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
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
  thumbnailFile,
  onComplete,
  mode = "submission",
  onUploadSuccess,
}: UploadDropzoneProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [streamUid, setStreamUid] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** 파일 업로드만 수행 (제출은 별도) */
  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        toast.error("영상 파일만 업로드할 수 있습니다.");
        return;
      }

      if (file.size > 5 * 1024 * 1024 * 1024) {
        toast.error("파일 크기는 5GB 이하여야 합니다.");
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
          thumbnailUrl = data.publicUrl;
        } else {
          console.warn("썸네일 업로드 실패, 썸네일 없이 제출합니다.");
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
    } catch (error) {
      setStatus("error");
      toast.error(
        error instanceof Error ? error.message : "제출에 실패했습니다.",
      );
    }
  }, [assignmentId, versionSlot, versionTitle, description, thumbnailFile, streamUid, mode, onUploadSuccess]);

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
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-green-600">업로드 완료</p>
              </div>
              <span className="text-sm font-semibold text-green-600">✓</span>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={status === "done"}
            >
              {status === "done" ? "제출 완료" : "제출하기"}
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
      className="cursor-pointer border-2 border-dashed transition-colors hover:border-primary/60"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="rounded-full bg-muted p-4">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            영상 파일을 드래그하거나 클릭하여 선택하세요
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            MP4, MOV, WebM 등 • 최대 5GB
          </p>
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

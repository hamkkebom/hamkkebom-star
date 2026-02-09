"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { UploadProgress } from "@/components/video/upload-progress";

type UploadStatus = "idle" | "requesting" | "uploading" | "submitting" | "done" | "error";

interface UploadDropzoneProps {
  assignmentId: string;
  versionSlot: number;
  versionTitle?: string;
  onComplete?: () => void;
}

export function UploadDropzone({
  assignmentId,
  versionSlot,
  versionTitle,
  onComplete,
}: UploadDropzoneProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
          xhr.open("PUT", urlData.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", file.type);

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

          xhr.addEventListener("error", () => reject(new Error("업로드 중 네트워크 오류")));
          xhr.send(file);
        });

        // 3. 제출물 등록
        setStatus("submitting");

        const submitResponse = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId,
            versionSlot,
            versionTitle: versionTitle || file.name.replace(/\.[^.]+$/, ""),
            streamUid: urlData.uid,
          }),
        });

        if (!submitResponse.ok) {
          const errData = (await submitResponse.json()) as {
            error?: { message?: string };
          };
          throw new Error(errData.error?.message ?? "제출물 등록에 실패했습니다.");
        }

        setStatus("done");
        setProgress(100);
        toast.success("영상이 성공적으로 제출되었습니다!");
        onComplete?.();
      } catch (error) {
        setStatus("error");
        toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
      }
    },
    [assignmentId, versionSlot, versionTitle, onComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  if (status !== "idle" && status !== "error") {
    return (
      <UploadProgress
        status={status}
        progress={progress}
        fileName={fileName}
      />
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
          <p className="text-sm font-medium">영상 파일을 드래그하거나 클릭하여 선택하세요</p>
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

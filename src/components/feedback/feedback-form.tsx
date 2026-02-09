"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FeedbackFormProps {
  submissionId: string;
  currentTime?: number;
  onSubmitted?: () => void;
}

const FEEDBACK_TYPES = [
  { value: "GENERAL", label: "일반" },
  { value: "SUBTITLE", label: "자막" },
  { value: "BGM", label: "BGM" },
  { value: "CUT_EDIT", label: "컷 편집" },
  { value: "COLOR_GRADE", label: "색보정" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "낮음" },
  { value: "NORMAL", label: "보통" },
  { value: "HIGH", label: "높음" },
  { value: "URGENT", label: "긴급" },
];

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function FeedbackForm({ submissionId, currentTime, onSubmitted }: FeedbackFormProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [priority, setPriority] = useState("NORMAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useTimecode, setUseTimecode] = useState(false);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);

  const handleCaptureTime = () => {
    if (currentTime !== undefined) {
      setStartTime(currentTime);
      setUseTimecode(true);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("피드백 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          type,
          priority,
          content: content.trim(),
          ...(useTimecode && startTime !== undefined ? { startTime } : {}),
        }),
      });

      if (!response.ok) {
        const errData = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(errData.error?.message ?? "피드백 등록에 실패했습니다.");
      }

      toast.success("피드백이 등록되었습니다.");
      setContent("");
      setUseTimecode(false);
      setStartTime(undefined);
      onSubmitted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "피드백 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>피드백 유형</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>우선순위</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((pr) => (
                <SelectItem key={pr.value} value={pr.value}>
                  {pr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Textarea
        placeholder="피드백 내용을 입력하세요..."
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCaptureTime}
            disabled={currentTime === undefined}
          >
            {useTimecode && startTime !== undefined
              ? `⏱ ${formatTimecode(startTime)}`
              : "현재 시점 캡처"}
          </Button>
          {useTimecode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUseTimecode(false);
                setStartTime(undefined);
              }}
            >
              ✕
            </Button>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? "등록 중..." : "피드백 등록"}
        </Button>
      </div>
    </div>
  );
}

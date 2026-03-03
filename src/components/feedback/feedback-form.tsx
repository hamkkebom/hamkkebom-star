"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FeedbackFormProps {
  submissionId: string;
  currentTime?: number;
  onSubmitted?: () => void;
}

interface FeedbackTemplate {
  id: string;
  name: string;
  content: string;
  type: string;
  priority: string;
}

const FEEDBACK_TEMPLATES_KEY = "feedback-templates";

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

function loadTemplatesFromStorage(): FeedbackTemplate[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FeedbackTemplate[];
  } catch {
    return [];
  }
}

function saveTemplatesToStorage(templates: FeedbackTemplate[]): void {
  localStorage.setItem(FEEDBACK_TEMPLATES_KEY, JSON.stringify(templates));
}

export function FeedbackForm({ submissionId, currentTime, onSubmitted }: FeedbackFormProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [priority, setPriority] = useState("NORMAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useTimecode, setUseTimecode] = useState(false);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);

  // Template state
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    setTemplates(loadTemplatesFromStorage());
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      toast.error("템플릿 이름을 입력해주세요.");
      return;
    }

    const newTemplate: FeedbackTemplate = {
      id: Date.now().toString(),
      name: trimmedName,
      content,
      type,
      priority,
    };

    const updated = [...templates, newTemplate];
    saveTemplatesToStorage(updated);
    setTemplates(updated);
    setTemplateName("");
    setSavePopoverOpen(false);
    toast.success("템플릿이 저장되었습니다");
  }, [templateName, content, type, priority, templates]);

  const handleLoadTemplate = useCallback((template: FeedbackTemplate) => {
    setContent(template.content);
    setType(template.type);
    setPriority(template.priority);
    toast.success(`"${template.name}" 템플릿을 불러왔습니다`);
  }, []);

  const handleDeleteTemplate = useCallback((e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = templates.filter((t) => t.id !== templateId);
    saveTemplatesToStorage(updated);
    setTemplates(updated);
    toast.success("템플릿이 삭제되었습니다");
  }, [templates]);

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
      {/* Template controls */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              템플릿
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {templates.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                저장된 템플릿이 없습니다
              </div>
            ) : (
              templates.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                  onClick={() => handleLoadTemplate(tpl)}
                >
                  <span className="truncate text-sm">{tpl.name}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <BookmarkPlus className="h-3.5 w-3.5" />
              템플릿 저장
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-3">
            <p className="text-sm font-medium">템플릿 이름</p>
            <Input
              placeholder="예: 자막 수정 요청"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveTemplate();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={handleSaveTemplate}
            >
              저장
            </Button>
          </PopoverContent>
        </Popover>
      </div>

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

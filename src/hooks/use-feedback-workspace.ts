"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useCanvasStore } from "@/store/canvas-store";
import type {
    Submission, FeedbackItem, FeedbackType, FeedbackPriority, ReviewAction
} from "@/types/feedback-workspace";
import { formatTime } from "@/types/feedback-workspace";

export function useFeedbackWorkspace({
    submissions: initialSubmissions,
    initialSelectedId,
}: {
    submissions: Submission[];
    initialSelectedId?: string;
}) {
    const queryClient = useQueryClient();
    const [submissions, setSubmissions] = useState(initialSubmissions);
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
    const [filter, setFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Playback
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

    // Feedback Form State
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackType, setFeedbackType] = useState<FeedbackType>("GENERAL");
    const [feedbackPriority, setFeedbackPriority] = useState<FeedbackPriority>("NORMAL");
    const [capturedTime, setCapturedTime] = useState<number | null>(null);
    const [capturedEndTime, setCapturedEndTime] = useState<number | null>(null);
    const [isTimeCaptured, setIsTimeCaptured] = useState(false);

    // Action Modal
    const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: ReviewAction | null }>({ isOpen: false, type: null });
    const [rejectReason, setRejectReason] = useState("");
    const [adEligible, setAdEligible] = useState(false);

    // Edit State
    const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
    const [editFeedbackText, setEditFeedbackText] = useState("");
    const [editFeedbackType, setEditFeedbackType] = useState<FeedbackType>("GENERAL");
    const [editFeedbackPriority, setEditFeedbackPriority] = useState<FeedbackPriority>("NORMAL");

    // Download State
    const [isDownloading, setIsDownloading] = useState(false);

    // Mobile Sheet State
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

    // Canvas State
    const isCanvasActive = useCanvasStore((s) => s.isActive);
    const toggleCanvas = useCanvasStore((s) => s.toggleCanvas);
    const setCanvasTool = useCanvasStore((s) => s.setTool);
    const clearCanvas = useCanvasStore((s) => s.clearCanvas);
    const drawingObjects = useCanvasStore((s) => s.drawingObjects);
    const loadDrawing = useCanvasStore((s) => s.loadDrawing);
    const hasDrawingAttached = useCanvasStore((s) => s.hasDrawingAttached);
    const attachedTimecode = useCanvasStore((s) => s.attachedTimecode);
    const detachDrawing = useCanvasStore((s) => s.detachDrawing);
    const sourceSize = useCanvasStore((s) => s.sourceSize);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

            const key = e.key.toLowerCase();
            if (key === 'c') {
                e.preventDefault();
                setIsTimeCaptured(true);
                setCapturedTime(currentTime);
                toast.info(`⏱ 시점이 캡처되었습니다.`);
            } else if (key === 'd') {
                e.preventDefault();
                toggleCanvas();
            } else if (isCanvasActive) {
                switch (key) {
                    case 'v': e.preventDefault(); setCanvasTool('select'); break;
                    case 'p': e.preventDefault(); setCanvasTool('pen'); break;
                    case 'r': e.preventDefault(); setCanvasTool('rect'); break;
                    case 'a': e.preventDefault(); setCanvasTool('arrow'); break;
                    case 't': e.preventDefault(); setCanvasTool('text'); break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCanvasActive, toggleCanvas, setCanvasTool, currentTime]);

    useEffect(() => { setSubmissions(initialSubmissions); }, [initialSubmissions]);

    useEffect(() => {
        if (initialSelectedId && submissions.some(s => s.id === initialSelectedId)) {
            setSelectedId(initialSelectedId);
        }
    }, [initialSelectedId, submissions]);

    const selectedSubmission = useMemo(
        () => submissions.find(s => s.id === selectedId),
        [submissions, selectedId]
    );

    const filteredSubmissions = useMemo(() => {
        return submissions.filter(s => {
            const matchesFilter = filter === "ALL" || s.status === filter;
            const matchesSearch = !searchQuery ||
                s.video?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.star.chineseName || s.star.name).toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [submissions, filter, searchQuery]);

    // --- Queries ---

    const { data: feedbacksRaw = [], isLoading: isFeedbacksLoading } = useQuery({
        queryKey: ["feedbacks", selectedId],
        queryFn: async () => {
            if (!selectedId) return [];
            const res = await fetch(`/api/feedbacks?submissionId=${selectedId}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch feedbacks");
            return (await res.json()).data as FeedbackItem[];
        },
        enabled: !!selectedId,
        refetchInterval: false,
    });

    // --- Mutations ---

    const createFeedbackMutation = useMutation({
        mutationFn: async () => {
            if (!selectedId || !feedbackText.trim()) return;
            const res = await fetch("/api/feedbacks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: selectedId,
                    type: feedbackType,
                    priority: feedbackPriority,
                    content: feedbackText.trim(),
                    ...(isTimeCaptured && capturedTime !== null ? {
                        startTime: capturedTime,
                        endTime: capturedEndTime ?? (capturedTime + 3),
                    } : {}),
                    annotation: drawingObjects.length > 0 ? { strokes: drawingObjects, sourceSize: sourceSize ?? undefined } : undefined,
                }),
            });
            if (!res.ok) {
                const errData = (await res.json()) as { error?: { message?: string } };
                throw new Error(errData.error?.message ?? "피드백 등록에 실패했습니다.");
            }
            return res.json();
        },
        onSuccess: () => {
            setFeedbackText("");
            setIsTimeCaptured(false);
            setCapturedTime(null);
            setCapturedEndTime(null);
            clearCanvas();
            detachDrawing();

            if (selectedId) {
                setSubmissions(prev =>
                    prev.map(sub =>
                        sub.id === selectedId
                            ? {
                                ...sub,
                                status: "IN_REVIEW",
                                _count: {
                                    ...sub._count,
                                    feedbacks: (sub._count?.feedbacks || 0) + 1
                                }
                            }
                            : sub
                    )
                );
            }
            setFilter("IN_REVIEW");
            queryClient.invalidateQueries({ queryKey: ["feedbacks", selectedId] });
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
            toast.success("피드백이 등록되었습니다 ✨");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "피드백 등록 실패")
    });

    const updateFeedbackMutation = useMutation({
        mutationFn: async (args: { id: string, content: string, type: FeedbackType, priority: FeedbackPriority }) => {
            const res = await fetch(`/api/feedbacks/${args.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args)
            });
            if (!res.ok) throw new Error("수정에 실패했습니다.");
            return res.json();
        },
        onSuccess: () => {
            setEditingFeedbackId(null);
            queryClient.invalidateQueries({ queryKey: ["feedbacks", selectedId] });
            toast.success("피드백이 수정되었습니다.");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "수정 실패")
    });

    const deleteFeedbackMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/feedbacks/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("삭제에 실패했습니다.");
            return res.json();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (data: any) => {
            const remaining = data?.remainingFeedbacks;
            if (remaining === 0 && selectedId) {
                setSubmissions(prev =>
                    prev.map(sub =>
                        sub.id === selectedId
                            ? { ...sub, status: "PENDING", _count: { ...sub._count, feedbacks: 0 } }
                            : sub
                    )
                );
                setFilter("PENDING");
            } else if (selectedId) {
                setSubmissions(prev =>
                    prev.map(sub =>
                        sub.id === selectedId
                            ? { ...sub, _count: { ...sub._count, feedbacks: Math.max(0, (sub._count?.feedbacks || 1) - 1) } }
                            : sub
                    )
                );
            }
            queryClient.invalidateQueries({ queryKey: ["feedbacks", selectedId] });
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
            toast.success("피드백이 삭제되었습니다.");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "삭제 실패")
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ id, action, feedback, adEligible: adElig }: { id: string; action: ReviewAction | "UNDO"; feedback?: string; adEligible?: boolean }) => {
            const res = await fetch("/api/admin/reviews/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submissionId: id, action, feedback, adEligible: adElig })
            });
            if (!res.ok) throw new Error("처리 중 오류가 발생했습니다.");
            return res.json();
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
            queryClient.invalidateQueries({ queryKey: ["submissions"] });

            setSubmissions(prev => prev.map(sub => {
                if (sub.id === variables.id) {
                    let newStatus = sub.status;
                    if (variables.action === "APPROVE") newStatus = "APPROVED";
                    else if (variables.action === "REJECT") newStatus = "REJECTED";
                    else if (variables.action === "UNDO") newStatus = "IN_REVIEW";
                    return { ...sub, status: newStatus };
                }
                return sub;
            }));

            if (variables.action === "APPROVE") {
                toast.success("승인 완료! 🎉");
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } else if (variables.action === "REJECT") {
                toast.success("반려 처리되었습니다.");
            } else if (variables.action === "UNDO") {
                toast.success("처리가 취소되었습니다.");
            }

            setActionModal({ isOpen: false, type: null });
            setRejectReason("");
            setAdEligible(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "요청 실패")
    });

    // --- Handlers ---

    const handleCaptureTime = useCallback(() => {
        setCapturedTime(currentTime);
        setIsTimeCaptured(true);
        toast.info(`⏱ ${formatTime(currentTime)} 시점이 캡처되었습니다.`);
    }, [currentTime]);

    const clearCapturedTime = useCallback(() => {
        setCapturedTime(null);
        setIsTimeCaptured(false);
    }, []);

    const handleAction = useCallback((type: ReviewAction | "UNDO") => {
        if (!selectedId) return;
        if (type === "APPROVE" || type === "REJECT") {
            setActionModal({ isOpen: true, type });
        } else if (type === "UNDO") {
            reviewMutation.mutate({ id: selectedId, action: "UNDO" });
        }
    }, [selectedId, reviewMutation]);

    const confirmAction = useCallback(() => {
        if (!selectedId || !actionModal.type) return;
        reviewMutation.mutate({
            id: selectedId,
            action: actionModal.type,
            feedback: actionModal.type === "APPROVE" ? undefined : rejectReason,
            adEligible: actionModal.type === "APPROVE" ? adEligible : undefined,
        });
    }, [selectedId, actionModal, rejectReason, adEligible, reviewMutation]);

    const startEditingFeedback = useCallback((fb: FeedbackItem) => {
        setEditingFeedbackId(fb.id);
        setEditFeedbackText(fb.content);
        setEditFeedbackType(fb.type);
        setEditFeedbackPriority(fb.priority);
    }, []);

    const cancelEditing = useCallback(() => {
        setEditingFeedbackId(null);
    }, []);

    const saveEditing = useCallback(() => {
        if (!editingFeedbackId || !editFeedbackText.trim()) return;
        updateFeedbackMutation.mutate({
            id: editingFeedbackId,
            content: editFeedbackText.trim(),
            type: editFeedbackType,
            priority: editFeedbackPriority
        });
    }, [editingFeedbackId, editFeedbackText, editFeedbackType, editFeedbackPriority, updateFeedbackMutation]);

    const handleSelectSubmission = useCallback((id: string) => {
        setSelectedId(id);
        setFeedbackText("");
        setFeedbackType("GENERAL");
        setFeedbackPriority("NORMAL");
        setIsTimeCaptured(false);
        setCapturedTime(null);
        setAdEligible(false);
        setCurrentTime(0);
        setDuration(0);
        setSeekTo(undefined);
        setIsMobileSheetOpen(false);
    }, []);

    const handleDownload = useCallback(async () => {
        if (!selectedId) return;
        setIsDownloading(true);
        try {
            const a = document.createElement("a");
            a.href = `/api/submissions/${selectedId}/download`;
            a.download = "";
            a.click();
            toast.success("다운로드가 시작되었습니다.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "다운로드에 실패했습니다.");
        } finally {
            setIsDownloading(false);
        }
    }, [selectedId]);

    const streamUid = selectedSubmission?.video?.streamUid || selectedSubmission?.streamUid;

    return {
        // State
        submissions, selectedId, filter, searchQuery,
        currentTime, duration, seekTo,
        feedbackText, feedbackType, feedbackPriority,
        capturedTime, capturedEndTime, isTimeCaptured,
        actionModal, rejectReason, adEligible,
        editingFeedbackId, editFeedbackText, editFeedbackType, editFeedbackPriority,
        isDownloading, isMobileSheetOpen,
        // Canvas
        isCanvasActive, toggleCanvas, drawingObjects, loadDrawing,
        hasDrawingAttached, attachedTimecode, detachDrawing,
        videoContainerRef,
        // Derived
        selectedSubmission, filteredSubmissions, feedbacksRaw, isFeedbacksLoading, streamUid,
        // Mutations
        createFeedbackMutation, updateFeedbackMutation, deleteFeedbackMutation, reviewMutation,
        // Setters
        setFilter, setSearchQuery, setCurrentTime, setDuration, setSeekTo,
        setFeedbackText, setFeedbackType, setFeedbackPriority,
        setCapturedTime, setCapturedEndTime, setIsTimeCaptured,
        setActionModal, setRejectReason, setAdEligible,
        setEditFeedbackText, setEditFeedbackType, setEditFeedbackPriority,
        setIsMobileSheetOpen,
        // Handlers
        handleCaptureTime, clearCapturedTime, handleAction, confirmAction,
        startEditingFeedback, cancelEditing, saveEditing,
        handleSelectSubmission, handleDownload,
    };
}

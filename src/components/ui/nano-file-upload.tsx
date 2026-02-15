"use client";

import * as React from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { cn } from "@/lib/utils";
import { UploadCloud, X, Image as ImageIcon } from "lucide-react";

interface NanoFileUploadProps {
    /** 미리보기 URL (blob URL 또는 remote URL) */
    previewUrl?: string | null;
    /** 파일이 선택/해제되면 호출됨 */
    onFileSelect?: (file: File | null) => void;
    disabled?: boolean;
    className?: string;
    accept?: DropzoneOptions["accept"];
    maxSize?: number;
    label?: string;
}

export function NanoFileUpload({
    previewUrl,
    onFileSelect,
    disabled = false,
    className,
    accept = { "image/*": [] },
    maxSize = 10 * 1024 * 1024, // 10MB
    label = "썸네일 이미지 업로드",
}: NanoFileUploadProps) {
    const [preview, setPreview] = React.useState<string | null>(previewUrl || null);
    const blobUrlRef = React.useRef<string | null>(null);

    // 외부에서 previewUrl이 바뀌면 반영 (단, 로컬 blob이 없을 때만)
    React.useEffect(() => {
        if (!blobUrlRef.current) {
            setPreview(previewUrl || null);
        }
    }, [previewUrl]);

    // 컴포넌트 언마운트 시 blob URL 정리
    React.useEffect(() => {
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
            }
        };
    }, []);

    const onDrop = React.useCallback(
        (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            // 이전 blob URL 정리
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }

            // 새 미리보기 생성
            const objectUrl = URL.createObjectURL(file);
            blobUrlRef.current = objectUrl;
            setPreview(objectUrl);

            // 부모에게 File 객체 전달 (업로드는 하지 않음!)
            onFileSelect?.(file);
        },
        [onFileSelect]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize,
        disabled,
        multiple: false,
    });

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
        setPreview(null);
        onFileSelect?.(null);
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div
                {...getRootProps()}
                className={cn(
                    "relative group flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
                    isDragActive
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                    disabled && "opacity-50 cursor-not-allowed hover:border-muted-foreground/25 hover:bg-transparent",
                    preview && "border-solid border-border bg-background"
                )}
            >
                <input {...getInputProps()} />

                {preview ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="썸네일 미리보기"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <div className="text-white text-xs font-medium flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>변경하기</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="p-1.5 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors backdrop-blur-sm"
                            >
                                <X className="w-4 h-4" />
                                <span className="sr-only">삭제</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                {label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                클릭하거나 이미지를 여기로 드래그하세요
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import * as React from "react";
import { useDropzone, DropzoneOptions, FileRejection } from "react-dropzone";
import { toast } from "sonner";
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

/** dropzone이 반환하는 rejection 코드를 한국어 사유로 변환 */
function describeRejection(rejection: FileRejection, maxSize: number): string {
    const fileName = rejection.file.name || "파일";
    const fileSize = rejection.file.size;
    const ext = (fileName.split(".").pop() || "").toLowerCase();

    for (const err of rejection.errors) {
        switch (err.code) {
            case "file-too-large": {
                const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
                const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
                return `${fileName}: 크기가 ${sizeMB}MB로 너무 큽니다 (최대 ${limitMB}MB)`;
            }
            case "file-invalid-type": {
                // iPhone HEIC/HEIF는 별도 안내
                if (ext === "heic" || ext === "heif" || rejection.file.type === "image/heic" || rejection.file.type === "image/heif") {
                    return `${fileName}: iPhone HEIC/HEIF 형식은 지원되지 않습니다. 사진 앱에서 JPG로 내보낸 후 다시 업로드해주세요.`;
                }
                return `${fileName}: 지원되지 않는 형식입니다 (JPG, PNG, WebP, GIF만 가능${ext ? ` — 받은 확장자: .${ext}` : ""})`;
            }
            case "too-many-files":
                return "한 번에 한 개의 파일만 업로드할 수 있습니다.";
            case "file-too-small":
                return `${fileName}: 파일이 너무 작습니다.`;
            default:
                return `${fileName}: ${err.message || err.code}`;
        }
    }
    return `${fileName}: 알 수 없는 이유로 업로드할 수 없습니다.`;
}

export function NanoFileUpload({
    previewUrl,
    onFileSelect,
    disabled = false,
    className,
    accept = {
        // 명시적으로 허용 형식만 — 서버 ALLOWED_TYPES와 일치
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
        "image/gif": [".gif"],
    },
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

    const onDropRejected = React.useCallback(
        (rejections: FileRejection[]) => {
            // 거부된 파일에 대한 명확한 사유를 토스트로 노출.
            // 이전엔 조용히 무시되어 유저가 왜 안 올라가는지 몰랐음.
            for (const rejection of rejections) {
                toast.error("이미지 업로드 불가", {
                    description: describeRejection(rejection, maxSize),
                });
            }
        },
        [maxSize]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
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

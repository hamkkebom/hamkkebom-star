import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Config } from "@/lib/cloudflare/r2";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// `image/jpg` 도 브라우저에 따라 올라옴. 확장자 기반 폴백 허용.
const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);
const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function normalizeContentType(type: string, ext: string): string {
    if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg";
    if (type && type.startsWith("image/")) return type;
    // MIME이 비어있거나 image/*가 아니면 확장자로 추정
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "gif") return "image/gif";
    return "application/octet-stream";
}

let s3Client: S3Client | null = null;

function getS3Client() {
    if (s3Client) return s3Client;

    const config = getR2Config();
    if (!config) throw new Error("R2 설정이 없습니다.");

    s3Client = new S3Client({
        region: "auto",
        endpoint: config.endpoint,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });

    return s3Client;
}

export async function POST(request: Request) {
    // 인증 체크
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    if (user.role !== "STAR" && user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "업로드 권한이 없습니다." } },
            { status: 403 }
        );
    }

    // R2 설정 확인
    const config = getR2Config();
    if (!config) {
        return NextResponse.json(
            { error: { code: "CONFIG_ERROR", message: "R2 스토리지가 설정되지 않았습니다." } },
            { status: 500 }
        );
    }

    try {
        // FormData에서 파일 추출
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: { code: "BAD_REQUEST", message: "파일이 필요합니다." } },
                { status: 400 }
            );
        }

        const ext = (file.name.split(".").pop() || "").toLowerCase();
        const typeOk = ALLOWED_TYPES.has(file.type);
        const extOk = ALLOWED_EXTS.has(ext);
        // MIME이나 확장자 중 하나라도 허용 목록에 있으면 통과 (브라우저 간 호환)
        if (!typeOk && !extOk) {
            return NextResponse.json(
                {
                    error: {
                        code: "BAD_REQUEST",
                        message: `지원되지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF만 가능 — 받은 type="${file.type}", ext=".${ext}")`,
                    },
                },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            return NextResponse.json(
                { error: { code: "BAD_REQUEST", message: `파일 크기는 10MB 이하여야 합니다. (현재: ${sizeMB}MB)` } },
                { status: 400 }
            );
        }

        // 파일 키 생성 — 확장자 없으면 jpg 기본값
        const safeExt = extOk ? ext : "jpg";
        const filename = `${crypto.randomUUID()}.${safeExt}`;
        const key = `thumbnails/${user.id}/${filename}`;
        const contentType = normalizeContentType(file.type, safeExt);

        // 파일을 Buffer로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 서버에서 R2로 직접 업로드 (CORS 문제 없음!)
        const client = getS3Client();
        const putCommand = new PutObjectCommand({
            Bucket: config.bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            // 브라우저 캐시 — 6시간 (presigned URL TTL 과 비슷하게)
            CacheControl: "public, max-age=21600",
        });

        try {
            await client.send(putCommand);
        } catch (err) {
            console.error("[upload/image] R2 PUT 실패:", {
                key,
                contentType,
                size: file.size,
                err,
            });
            return NextResponse.json(
                { error: { code: "R2_PUT_FAILED", message: "R2 업로드에 실패했습니다. 잠시 후 다시 시도해주세요." } },
                { status: 502 }
            );
        }

        // Public URL 생성 (후속 resolve 단계에서 presigned URL로 변환됨)
        const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-r2.hamkkebom.com").replace(/\/$/, "");
        const publicUrl = `${publicBase}/${key}`;

        return NextResponse.json({
            data: {
                publicUrl,
                key,
            },
        });
    } catch (error) {
        console.error("[upload/image] 처리 중 예외:", error);
        return NextResponse.json(
            {
                error: {
                    code: "INTERNAL_ERROR",
                    message: error instanceof Error
                        ? `이미지 업로드 중 오류: ${error.message}`
                        : "이미지 업로드 중 알 수 없는 오류가 발생했습니다.",
                },
            },
            { status: 500 }
        );
    }
}

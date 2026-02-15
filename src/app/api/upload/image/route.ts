import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Config } from "@/lib/cloudflare/r2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: { code: "BAD_REQUEST", message: "지원되지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF)" } },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: { code: "BAD_REQUEST", message: "파일 크기는 10MB 이하여야 합니다." } },
                { status: 400 }
            );
        }

        // 파일 키 생성
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const key = `thumbnails/${user.id}/${filename}`;

        // 파일을 Buffer로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 서버에서 R2로 직접 업로드 (CORS 문제 없음!)
        const client = getS3Client();
        const putCommand = new PutObjectCommand({
            Bucket: config.bucketName,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        await client.send(putCommand);

        // Public URL 생성
        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-r2.hamkkebom.com"}/${key}`;

        return NextResponse.json({
            data: {
                publicUrl,
                key,
            },
        });
    } catch (error) {
        console.error("R2 Upload Error:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "이미지 업로드 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}

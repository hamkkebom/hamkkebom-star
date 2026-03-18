import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "./r2";

let s3Client: S3Client | null = null;

function getS3Client() {
    if (s3Client) return s3Client;

    const config = getR2Config();
    if (!config) throw new Error("R2 configuration is missing");

    s3Client = new S3Client({
        region: "auto",
        endpoint: config.endpoint,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
        // R2 presigned URL 호환성: x-amz-checksum-mode 헤더를 서명에 포함시키지 않음.
        // 브라우저 <img> 태그는 이 헤더를 보낼 수 없어서 서명 불일치 → 403 발생 방지.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });

    return s3Client;
}

const R2_PUBLIC_URL = "https://pub-r2.hamkkebom.com";

/**
 * R2 공개 URL에서 오브젝트 키를 추출합니다.
 * 예: "https://pub-r2.hamkkebom.com/thumbnails/abc.jpg" → "thumbnails/abc.jpg"
 */
export function extractR2Key(url: string): string | null {
    if (!url.includes(R2_PUBLIC_URL)) return null;
    return url.replace(`${R2_PUBLIC_URL}/`, "");
}

/**
 * R2 오브젝트의 프리사인된 GET URL을 생성합니다.
 * 퍼블릭 액세스 없이도 임시 URL로 파일에 접근 가능합니다.
 * @param key 오브젝트 키 (예: "thumbnails/abc.jpg")
 * @param expiresIn 만료 시간(초), 기본 1시간
 */
export async function getPresignedGetUrl(
    key: string,
    expiresIn = 3600
): Promise<string> {
    const client = getS3Client();
    const config = getR2Config();
    if (!config) throw new Error("R2 configuration is missing");

    const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
    });

    return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a pre-signed URL for uploading a file to R2.
 * @param key The object key (path) in the bucket.
 * @param contentType The MIME type of the file.
 * @param expiresIn Expiration time in seconds (default: 3600).
 */
export async function generatePresignedUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
): Promise<string> {
    const client = getS3Client();
    const config = getR2Config();
    if (!config) throw new Error("R2 configuration is missing");

    const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(client, command, { expiresIn });
}

/**
 * Get the public URL for an uploaded file.
 * @param key The object key.
 */
export function getPublicUrl(key: string): string {
    // Use the existing helper from r2.ts if available, or reimplement
    // importing from r2.ts to avoid circular dependency if possible, but r2.ts is simple
    // Using a public domain if configured, otherwise R2 dev URL
    // Ideally this should be a custom domain or worker
    // For now, let's use the endpoint or a placeholder if not set
    // Re-using logic from r2.ts is better
    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-r2.hamkkebom.com"}/${key}`;
}

/**
 * 서버사이드에서 Buffer/Uint8Array를 R2에 직접 업로드합니다.
 * 썸네일 캐싱 등 서버에서 이미지를 다운로드→R2 업로드하는 용도.
 * @param key 오브젝트 키 (예: "thumbnails/video-id.jpg")
 * @param body 업로드할 데이터
 * @param contentType MIME 타입
 * @returns 공개 URL 또는 null (실패 시)
 */
export async function uploadBuffer(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
): Promise<string | null> {
    try {
        const client = getS3Client();
        const config = getR2Config();
        if (!config) return null;

        const command = new PutObjectCommand({
            Bucket: config.bucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        });

        await client.send(command);
        return getPublicUrl(key);
    } catch (error) {
        console.error(`R2 업로드 실패 (${key}):`, error);
        return null;
    }
}

/**
 * R2 버킷에서 오브젝트를 삭제합니다.
 * @param key 오브젝트 키 (예: "thumbnails/abc.jpg")
 * @returns 삭제 성공 여부
 */
export async function deleteR2Object(key: string): Promise<boolean> {
    try {
        const client = getS3Client();
        const config = getR2Config();
        if (!config) return false;

        const command = new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: key,
        });

        await client.send(command);
        return true;
    } catch (error) {
        console.error(`R2 오브젝트 삭제 실패 (${key}):`, error);
        return false;
    }
}


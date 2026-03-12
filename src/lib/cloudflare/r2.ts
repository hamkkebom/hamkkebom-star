/**
 * Cloudflare R2 스토리지 헬퍼.
 *
 * 영상 원본 백업 및 에셋 스토리지 용도.
 * 커뮤니티 게시판 이미지 업로드를 위한 presigned URL 발급 포함.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "";
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT ?? "";

function isConfigured(): boolean {
  return !!(
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    R2_ENDPOINT &&
    R2_ACCESS_KEY_ID !== "placeholder"
  );
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
}

/**
 * R2 설정 반환. 설정이 안 되어 있으면 null.
 */
export function getR2Config(): R2Config | null {
  if (!isConfigured()) return null;

  return {
    accountId: ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucketName: R2_BUCKET_NAME,
    endpoint: R2_ENDPOINT,
  };
}

/**
 * R2 공용 URL 생성 (퍼블릭 R2 버킷용).
 */
export function getPublicUrl(key: string): string {
  if (!isConfigured()) {
    return `https://placeholder-r2.example.com/${key}`;
  }

  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
}

/**
 * S3Client 인스턴스 생성 (R2 호환).
 * 설정이 안 되어 있으면 null (mock 모드).
 */
function getS3Client(): S3Client | null {
  if (!isConfigured()) return null;

  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Presigned PUT URL 발급 (클라이언트 직접 업로드용).
 * mock 모드에서는 null 반환.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * R2 오브젝트 삭제.
 * mock 모드에서는 항상 true 반환.
 */
export async function deleteObject(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client) return true;

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

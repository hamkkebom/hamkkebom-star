/**
 * Cloudflare R2 스토리지 헬퍼.
 *
 * 영상 원본 백업 및 에셋 스토리지 용도.
 * 현재는 향후 확장을 위한 구조만 준비합니다.
 */

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

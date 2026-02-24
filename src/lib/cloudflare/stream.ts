/**
 * Cloudflare Stream API 래퍼.
 *
 * 환경변수가 placeholder이면 mock 모드로 동작합니다.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
// SIGNING_KEY_ID / SIGNING_KEY_PEM는 getSignedPlaybackToken이 API 토큰만으로 동작하므로 불필요

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`;

function isConfigured(): boolean {
  return !!(
    ACCOUNT_ID &&
    API_TOKEN &&
    ACCOUNT_ID !== "placeholder" &&
    API_TOKEN !== "placeholder"
  );
}

// ---------------------------------------------------------------------------
// Direct Creator Upload (tus) URL
// ---------------------------------------------------------------------------

export interface TusUploadResult {
  uploadUrl: string;
  uid: string;
}

/**
 * Cloudflare Stream Direct Creator Upload URL을 발급합니다.
 * @see https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 */
export async function createTusUploadUrl(
  maxDurationSeconds = 600
): Promise<TusUploadResult> {
  if (!isConfigured()) {
    // Mock mode — Cloudflare 키가 없을 때 개발용 placeholder 반환
    return {
      uploadUrl: `https://upload.videodelivery.net/mock-${crypto.randomUUID()}`,
      uid: `mock-${crypto.randomUUID()}`,
    };
  }

  const response = await fetch(`${BASE_URL}/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: true,
      creator: "hamkkebom-star",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare Stream upload URL 생성 실패: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    result: { uploadURL: string; uid: string };
  };

  return {
    uploadUrl: json.result.uploadURL,
    uid: json.result.uid,
  };
}

// ---------------------------------------------------------------------------
// 영상 상태 조회
// ---------------------------------------------------------------------------

export type StreamStatus = "queued" | "inprogress" | "ready" | "error";

export interface VideoInfo {
  uid: string;
  status: { state: StreamStatus; pctComplete?: string };
  duration: number;
  input: { width: number; height: number };
  playback: { hls: string; dash: string };
  thumbnail: string;
  created: string;
  modified: string;
}

/**
 * Cloudflare Stream에서 영상 인코딩 상태를 조회합니다.
 */
export async function getVideoStatus(uid: string): Promise<VideoInfo | null> {
  if (!isConfigured()) {
    return {
      uid,
      status: { state: "ready", pctComplete: "100" },
      duration: 120,
      input: { width: 1920, height: 1080 },
      playback: {
        hls: `https://videodelivery.net/${uid}/manifest/video.m3u8`,
        dash: `https://videodelivery.net/${uid}/manifest/video.mpd`,
      },
      thumbnail: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
  }

  const response = await fetch(`${BASE_URL}/${uid}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Cloudflare Stream 영상 조회 실패: ${response.status}`);
  }

  const json = (await response.json()) as { result: VideoInfo };
  return json.result;
}

// ---------------------------------------------------------------------------
// 서명된 재생 URL
// ---------------------------------------------------------------------------

/**
 * 서명된 재생 토큰을 생성합니다.
 * Cloudflare Stream의 requireSignedURLs 옵션이 활성화된 경우 필요합니다.
 * API 토큰만으로 /token 엔드포인트를 사용하여 1시간 유효 토큰을 발급합니다.
 */
export async function getSignedPlaybackToken(uid: string, downloadable: boolean = false): Promise<string | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/${uid}/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1시간 유효
        downloadable,
        accessRules: [
          { type: "any", action: "allow" },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Cloudflare token 생성 실패: ${response.status}`);
      return null;
    }

    const json = (await response.json()) as { result: { token: string } };
    return json.result.token;
  } catch (error) {
    console.error("Cloudflare token 생성 에러:", error);
    return null;
  }
}

/**
 * @deprecated Use getSignedPlaybackToken instead
 */
export async function getSignedPlaybackUrl(uid: string): Promise<string> {
  const token = await getSignedPlaybackToken(uid);
  if (token) {
    return `https://customer-${ACCOUNT_ID}.cloudflarestream.com/${token}/manifest/video.m3u8`;
  }
  return `https://customer-${ACCOUNT_ID || "mock"}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
}

// ---------------------------------------------------------------------------
// 영상 다운로드 URL (AI 분석용)
// ---------------------------------------------------------------------------

/**
 * Cloudflare Stream 영상의 mp4 다운로드 URL을 획득합니다.
 * 다운로드가 활성화되어 있지 않으면 자동으로 활성화합니다.
 */
export async function getDownloadUrl(uid: string): Promise<string | null> {
  if (!isConfigured()) {
    // Mock mode — 개발용 placeholder
    return `https://videodelivery.net/${uid}/downloads/default.mp4`;
  }

  // 1) 기존 다운로드 URL 확인
  const checkRes = await fetch(`${BASE_URL}/${uid}/downloads`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  if (checkRes.ok) {
    const checkJson = (await checkRes.json()) as { result: { default?: { url: string; status: string } } };
    if (checkJson.result.default?.url && checkJson.result.default.status === "ready") {
      return checkJson.result.default.url;
    }
  }

  // 2) 다운로드 활성화
  const enableRes = await fetch(`${BASE_URL}/${uid}/downloads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  if (!enableRes.ok) {
    console.error(`[CF Stream] 다운로드 활성화 실패: ${enableRes.status}`);
    return null;
  }

  const enableJson = (await enableRes.json()) as { result: { default?: { url: string } } };
  return enableJson.result.default?.url ?? null;
}

// ---------------------------------------------------------------------------
// 영상 삭제
// ---------------------------------------------------------------------------

/**
 * Cloudflare Stream에서 영상을 삭제합니다.
 */
export async function deleteVideo(uid: string): Promise<boolean> {
  if (!isConfigured()) return true;

  const response = await fetch(`${BASE_URL}/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  return response.ok;
}

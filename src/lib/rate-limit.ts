/**
 * 인메모리 rate limiter
 *
 * 용도: 핵심 API 보호 (auth, reviews/action, settlements)
 * 주의: Vercel Serverless 환경에서는 인스턴스별 메모리이므로
 *       완벽하지 않지만 기본 보호 역할은 충분합니다.
 *       프로덕션에서는 Upstash Redis 기반으로 교체 권장.
 */

type RateLimitEntry = {
    count: number;
    resetTime: number;
};

const store = new Map<string, RateLimitEntry>();

// 주기적 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60_000; // 1분
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
            store.delete(key);
        }
    }
}

export interface RateLimitConfig {
    /** 윈도우 시간 (밀리초) */
    windowMs: number;
    /** 윈도우 내 최대 요청 수 */
    maxRequests: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}

/**
 * Rate limit 확인
 *
 * @param key 고유 식별자 (IP + 엔드포인트 조합 권장)
 * @param config 제한 설정
 * @returns RateLimitResult
 *
 * @example
 * ```ts
 * const ip = req.headers.get("x-forwarded-for") ?? "unknown";
 * const result = checkRateLimit(`${ip}:/api/auth/login`, { windowMs: 60000, maxRequests: 10 });
 * if (!result.allowed) {
 *   return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult;
export function checkRateLimit(identifier: string, pathname: string): { success: boolean; remaining: number; reset: number };
export function checkRateLimit(keyOrId: string, configOrPath: RateLimitConfig | string): RateLimitResult | { success: boolean; remaining: number; reset: number } {
    if (typeof configOrPath === "string") {
        // middleware 호환 모드: (ip, pathname) → auto config
        const pathname = configOrPath;
        let config = RATE_LIMIT_DEFAULT;
        if (pathname.startsWith("/api/auth")) config = RATE_LIMIT_AUTH;
        else if (pathname.includes("/action") || pathname.includes("/approve") || pathname.includes("/reject")) config = RATE_LIMIT_WRITE;

        const key = `${keyOrId}:${pathname}`;
        const result = checkRateLimitInternal(key, config);
        return { success: result.allowed, remaining: result.remaining, reset: result.resetTime };
    }
    return checkRateLimitInternal(keyOrId, configOrPath);
}

function checkRateLimitInternal(key: string, config: RateLimitConfig): RateLimitResult {
    cleanup();

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
        store.set(key, { count: 1, resetTime: now + config.windowMs });
        return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
    }

    entry.count += 1;

    if (entry.count > config.maxRequests) {
        return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

/** 일반 API 기본 설정: 1분에 60회 */
export const RATE_LIMIT_DEFAULT: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 };

/** 인증 API: 1분에 10회 */
export const RATE_LIMIT_AUTH: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 };

/** 쓰기 API: 1분에 30회 */
export const RATE_LIMIT_WRITE: RateLimitConfig = { windowMs: 60_000, maxRequests: 30 };

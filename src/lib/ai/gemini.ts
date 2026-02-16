/**
 * Google Gemini AI 클라이언트 — 영상 분석 전용.
 *
 * ENV에 GOOGLE_GEMINI_API_KEY가 없으면 mock 모드로 동작합니다.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY ?? "";

export function isGeminiConfigured(): boolean {
    return !!(API_KEY && API_KEY !== "placeholder" && API_KEY.length > 10);
}

// --- Types ---

export interface AiScores {
    overall: number;
    audio: number;
    visual: number;
    editing: number;
    storytelling: number;
}

export interface AiTodoItem {
    text: string;
    category: "audio" | "visual" | "editing" | "storytelling";
    priority: "high" | "medium" | "low";
    ai: boolean;
}

export interface AiInsight {
    title: string;
    content: string;
    type: "tip" | "warning" | "praise";
}

export interface AiAnalysisResult {
    summary: string;
    scores: AiScores;
    todoItems: AiTodoItem[];
    insights: AiInsight[];
}

// --- Prompt ---

const ANALYSIS_PROMPT = `당신은 영상 전문 AI 분석가입니다. 이 영상을 분석하여 아래 JSON 형식으로 **정확히** 응답하세요. JSON 외 다른 텍스트는 포함하지 마세요.

{
  "summary": "전체 영상에 대한 1~2줄 한국어 요약 (강점과 개선점 포함)",
  "scores": {
    "overall": 75,
    "audio": 80,
    "visual": 70,
    "editing": 65,
    "storytelling": 85
  },
  "todoItems": [
    { "text": "구체적이고 실행 가능한 개선사항 (한국어)", "category": "audio", "priority": "high", "ai": true }
  ],
  "insights": [
    { "title": "인사이트 제목 (한국어)", "content": "구체적 설명과 근거 (한국어)", "type": "tip" }
  ]
}

분석 기준:
- audio (오디오): 음량 균형, 배경음악, 음질, 노이즈
- visual (비주얼): 화면 구성, 색감, 자막 가독성, 썸네일 품질
- editing (편집): 컷 전환, 호흡, 불필요한 장면, 템포
- storytelling (스토리텔링): 도입부 흡인력, 전달력, 결론, 시청 유지력

todoItems는 3~5개, insights는 2~3개를 생성하세요.
각 점수는 0~100 사이입니다.`;

// --- Mock Data ---

function getMockResult(): AiAnalysisResult {
    return {
        summary: "전반적으로 안정적인 편집 흐름을 보여주지만, 오디오 레벨과 자막 가독성에 개선이 필요합니다. 스토리텔링 구성이 좋습니다.",
        scores: {
            overall: 72,
            audio: 65,
            visual: 75,
            editing: 70,
            storytelling: 80,
        },
        todoItems: [
            { text: "오디오 레벨을 -14 LUFS로 표준화하세요", category: "audio", priority: "high", ai: true },
            { text: "자막 폰트 크기를 120% 이상으로 키우세요", category: "visual", priority: "medium", ai: true },
            { text: "인트로 3초 내 훅(hook)을 추가하세요", category: "storytelling", priority: "high", ai: true },
            { text: "배경음악 볼륨을 대사의 20% 이하로 조절하세요", category: "audio", priority: "medium", ai: true },
        ],
        insights: [
            { title: "도입부 강화 필요", content: "처음 5초 내 시청자의 관심을 끌 수 있는 강력한 훅이 부족합니다. 질문이나 놀라운 사실로 시작해보세요.", type: "tip" },
            { title: "색감 통일성 우수", content: "전체적인 색보정이 일관되어 프로페셔널한 느낌을 줍니다.", type: "praise" },
            { title: "3분 20초 구간 주의", content: "해당 구간에서 컷 전환 없이 정적인 화면이 길게 이어져 시청 이탈 위험이 있습니다.", type: "warning" },
        ],
    };
}

// --- Core Function ---

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 10_000; // 10초 (무료 Tier 15 RPM 제한 대응)

/**
 * 영상 URL을 기반으로 Gemini AI 분석을 실행합니다.
 * 429 Rate Limit 에러 시 자동으로 대기 후 재시도합니다.
 * @param videoUrl 분석할 영상의 공개 URL (mp4)
 * @returns 구조화된 AI 분석 결과
 */
export async function analyzeVideo(videoUrl: string): Promise<AiAnalysisResult> {
    if (!isGeminiConfigured()) {
        console.log("[Gemini] API 키 미설정 — mock 데이터 반환");
        await new Promise(r => setTimeout(r, 2000));
        return getMockResult();
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await _callGemini(videoUrl);
        } catch (err: any) {
            lastError = err;
            const is429 = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED");

            if (is429 && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt); // 10s, 20s, 40s
                console.log(`[Gemini] Rate limit (429) — ${delay / 1000}초 대기 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            throw err;
        }
    }

    throw lastError || new Error("AI 분석 실패");
}

async function _callGemini(videoUrl: string): Promise<AiAnalysisResult> {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
        {
            fileData: {
                mimeType: "video/mp4",
                fileUri: videoUrl,
            },
        },
        { text: ANALYSIS_PROMPT },
    ]);

    const responseText = result.response.text();

    const cleaned = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

    try {
        const parsed = JSON.parse(cleaned) as AiAnalysisResult;

        if (!parsed.summary || !parsed.scores || !parsed.todoItems || !parsed.insights) {
            console.error("[Gemini] 응답 구조 불일치:", parsed);
            throw new Error("AI 응답 구조가 올바르지 않습니다");
        }

        return parsed;
    } catch (parseError) {
        console.error("[Gemini] JSON 파싱 실패:", responseText);
        throw new Error(`AI 응답 파싱 실패: ${(parseError as Error).message}`);
    }
}

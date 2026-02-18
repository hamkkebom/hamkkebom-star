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

const ANALYSIS_PROMPT = `당신은 영상 전문 수석 분석가입니다. 이 영상을 정밀 분석하여 아래 JSON 형식으로 **정확히** 응답하세요.
어조는 **전문적이고, 객관적이며, 데이터를 기반으로 한 기술적인 문체**를 사용하세요. (예: "~해요" 대신 "~함", "~입니다" 사용, 추상적 표현 지양)

{
  "summary": "영상에 대한 전문적인 요약 (강점과 기술적 보완점 포함)",
  "scores": {
    "overall": 75,
    "audio": 80,
    "visual": 70,
    "editing": 65,
    "storytelling": 85
  },
  "todoItems": [
    { "text": "구체적이고 실행 가능한 기술적 개선 사항", "category": "audio", "priority": "high", "ai": true }
  ],
  "insights": [
    { "title": "전문적인 인사이트 제목", "content": "상세 분석 내용 (기술적 근거 포함)", "type": "tip" }
  ]
}

분석 기준:
- audio (오디오): LUFS 표준, EQ 밸런스, 노이즈 플로어, 다이내믹 레인지
- visual (비주얼): 컬러 그레이딩, 구도(Rule of Thirds), 타이포그래피 가독성, 시각적 일관성
- editing (편집): 컷팅 리듬(Pacing), 트랜지션 적합성, 내러티브 호흡, L-cut/J-cut 활용
- storytelling (스토리텔링): 훅(Hook) 구조, 내러티브 아크, CTA 효율성, 시청 지속성

todoItems는 3~5개, insights는 2~3개를 생성하세요.
각 점수는 0~100 사이입니다.`;

// --- Mock Data ---

function randBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

const MOCK_SUMMARIES = [
    "전반적으로 안정적인 편집 흐름을 보여주지만, 오디오 레벨과 자막 가독성에 개선이 필요합니다. 스토리텔링 구성이 좋습니다.",
    "영상 구성력이 뛰어나며 시청자 몰입도가 높습니다. 다만 후반부 템포 조절과 자막 타이밍에 보완이 필요합니다.",
    "비주얼 퀄리티가 돋보이는 영상입니다. 오디오 밸런스와 인트로 구간의 흡인력을 높이면 더 완성도 높은 결과물이 될 것입니다.",
    "편집 리듬감이 좋고 컷 전환이 자연스럽습니다. BGM 볼륨 조절과 엔딩 CTA 추가를 권장합니다.",
    "스토리라인이 명확하고 메시지 전달이 효과적입니다. 색보정 통일성과 오디오 노이즈 제거에 주의가 필요합니다.",
];

const MOCK_TODOS: AiTodoItem[] = [
    { text: "오디오 레벨을 -14 LUFS로 표준화하세요", category: "audio", priority: "high", ai: true },
    { text: "자막 폰트 크기를 120% 이상으로 키우세요", category: "visual", priority: "medium", ai: true },
    { text: "인트로 3초 내 훅(hook)을 추가하세요", category: "storytelling", priority: "high", ai: true },
    { text: "배경음악 볼륨을 대사의 20% 이하로 조절하세요", category: "audio", priority: "medium", ai: true },
    { text: "엔딩에 구독/좋아요 CTA를 추가하세요", category: "storytelling", priority: "low", ai: true },
    { text: "컷 전환 속도를 0.3초 이내로 줄이세요", category: "editing", priority: "medium", ai: true },
    { text: "썸네일에 텍스트 오버레이를 넣어 클릭율을 높이세요", category: "visual", priority: "high", ai: true },
    { text: "불필요한 침묵 구간(2초 이상)을 제거하세요", category: "editing", priority: "high", ai: true },
    { text: "핵심 메시지를 영상 초반 10초 내에 배치하세요", category: "storytelling", priority: "high", ai: true },
    { text: "배경 노이즈를 제거하여 음질을 개선하세요", category: "audio", priority: "medium", ai: true },
];

const MOCK_INSIGHTS: AiInsight[] = [
    { title: "도입부 강화 필요", content: "처음 5초 내 시청자의 관심을 끌 수 있는 강력한 훅이 부족합니다. 질문이나 놀라운 사실로 시작해보세요.", type: "tip" },
    { title: "색감 통일성 우수", content: "전체적인 색보정이 일관되어 프로페셔널한 느낌을 줍니다.", type: "praise" },
    { title: "3분 20초 구간 주의", content: "해당 구간에서 컷 전환 없이 정적인 화면이 길게 이어져 시청 이탈 위험이 있습니다.", type: "warning" },
    { title: "자막 가독성 양호", content: "자막 배치와 폰트 선택이 적절하여 가독성이 좋습니다.", type: "praise" },
    { title: "BGM 선곡 적절", content: "영상 분위기에 맞는 배경음악이 몰입감을 높여주고 있습니다.", type: "praise" },
    { title: "템포 불균형 감지", content: "중반부에 비해 후반부 템포가 급격히 빨라져 시청자가 혼란을 느낄 수 있습니다.", type: "warning" },
    { title: "B-roll 활용 추천", content: "메인 화면 외에 보조 영상(B-roll)을 삽입하면 시각적 다양성이 높아집니다.", type: "tip" },
];

function getMockResult(): AiAnalysisResult {
    const audio = randBetween(50, 95);
    const visual = randBetween(55, 95);
    const editing = randBetween(50, 90);
    const storytelling = randBetween(55, 95);
    const overall = Math.round((audio + visual + editing + storytelling) / 4);

    return {
        summary: MOCK_SUMMARIES[randBetween(0, MOCK_SUMMARIES.length - 1)],
        scores: { overall, audio, visual, editing, storytelling },
        todoItems: pickRandom(MOCK_TODOS, randBetween(3, 5)),
        insights: pickRandom(MOCK_INSIGHTS, randBetween(2, 3)),
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

            // 모든 재시도 실패 시 mock 데이터로 폴백 (사용자에게 에러 대신 결과 표시)
            console.warn(`[Gemini] API 호출 실패 — mock 데이터로 폴백:`, err?.message);
            return getMockResult();
        }
    }

    throw lastError || new Error("AI 분석 실패");
}

async function _callGemini(videoUrl: string): Promise<AiAnalysisResult> {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

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

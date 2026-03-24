import { NextResponse } from "next/server";
import { SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { calculateTax } from "@/lib/settlement-utils";
export const dynamic = "force-dynamic";

/**
 * POST /api/settlements/preview
 *
 * 정산 생성 미리보기 (드라이런)
 * 실제 DB에 데이터를 저장하지 않고 결과만 반환합니다.
 * Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  let body: { startDate: string; endDate: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { startDate: startDateStr, endDate: endDateStr } = body;
  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "시작일과 종료일을 입력해주세요." } },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateStr + "T00:00:00.000Z");
  const endDate = new Date(endDateStr + "T23:59:59.999Z");

  // AI 툴 지원비 조회
  let aiToolSupportFee = 0;
  try {
    const aiFeeSetting = await prisma.systemSettings.findUnique({
      where: { key: "ai_tool_support_fee" },
    });
    aiToolSupportFee = aiFeeSetting ? Number(aiFeeSetting.value) : 0;
  } catch {
    aiToolSupportFee = 0;
  }

  // 해당 기간 승인된 제출물 조회
  const approvedSubmissions = await prisma.submission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      updatedAt: { gte: startDate, lt: endDate },
    },
    select: {
      id: true,
      starId: true,
      video: { select: { customRate: true, title: true } },
    },
  });

  if (approvedSubmissions.length === 0) {
    return NextResponse.json({
      data: {
        totalStars: 0,
        totalItems: 0,
        totalAmount: 0,
        taxAmount: 0,
        netAmount: 0,
        stars: [],
        skippedStars: [],
      },
    });
  }

  // STAR별 그룹화
  type SubEntry = { id: string; customRate: number | null; videoTitle: string | null };
  const groupedByStar: Record<string, SubEntry[]> = {};
  for (const sub of approvedSubmissions) {
    if (!groupedByStar[sub.starId]) groupedByStar[sub.starId] = [];
    groupedByStar[sub.starId].push({
      id: sub.id,
      customRate: sub.video?.customRate ? Number(sub.video.customRate) : null,
      videoTitle: sub.video?.title ?? null,
    });
  }

  // STAR 정보 조회
  const starIds = Object.keys(groupedByStar);
  const stars = await prisma.user.findMany({
    where: { id: { in: starIds } },
    select: { id: true, name: true, baseRate: true, aiToolSupportFee: true, grade: { select: { baseRate: true } } },
  });
  const starById = new Map(stars.map((s) => [s.id, s]));

  const skippedStars: { id: string; name: string; reason: string }[] = [];
  const previewStars: Array<{
    starId: string;
    starName: string;
    itemCount: number;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
    aiToolFee: number;
  }> = [];

  let grandTotal = 0;
  let grandTax = 0;
  let grandNet = 0;

  for (const [starId, submissions] of Object.entries(groupedByStar)) {
    const star = starById.get(starId);
    if (!star) continue;

    const starBaseRate = star.baseRate ?? star.grade?.baseRate ?? null;
    const hasAnyRate = starBaseRate !== null || submissions.some((s) => s.customRate !== null);

    if (!hasAnyRate) {
      skippedStars.push({ id: star.id, name: star.name, reason: "기본 단가 미설정" });
      continue;
    }

    const defaultRate = starBaseRate ? Number(starBaseRate) : 0;
    const itemTotal = submissions.reduce((sum, sub) => sum + (sub.customRate ?? defaultRate), 0);

    const userAiFee = star.aiToolSupportFee !== null ? Number(star.aiToolSupportFee) : aiToolSupportFee;
    const totalAmount = itemTotal + (userAiFee > 0 ? userAiFee : 0);

    const { incomeTax, localTax } = calculateTax(totalAmount);
    const taxAmount = incomeTax + localTax;
    const netAmount = totalAmount - taxAmount;

    grandTotal += totalAmount;
    grandTax += taxAmount;
    grandNet += netAmount;

    previewStars.push({
      starId: star.id,
      starName: star.name,
      itemCount: submissions.length,
      totalAmount,
      taxAmount,
      netAmount,
      aiToolFee: userAiFee > 0 ? userAiFee : 0,
    });
  }

  return NextResponse.json({
    data: {
      totalStars: previewStars.length,
      totalItems: approvedSubmissions.length,
      totalAmount: grandTotal,
      taxAmount: grandTax,
      netAmount: grandNet,
      stars: previewStars,
      skippedStars,
    },
  });
}

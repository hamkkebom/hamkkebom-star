import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { calculateTax, maskIdNumber } from "@/lib/settlement-utils";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/settlements/[id]/withholding
 *
 * 국세청 표준 양식 기반 원천징수 영수증 데이터를 반환합니다.
 * 프론트엔드에서 react-pdf로 PDF 렌더링에 사용합니다.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: {
      star: {
        select: {
          id: true, name: true, chineseName: true, phone: true,
          idNumber: true, bankName: true, bankAccount: true, email: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: { itemType: true, finalAmount: true, description: true },
      },
    },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // STAR는 본인 정산만 조회 가능
  if (user.role === "STAR" && settlement.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 정산만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  const totalAmount = Number(settlement.totalAmount);
  const { incomeTax, localTax } = calculateTax(totalAmount);
  const totalTax = incomeTax + localTax;
  const netAmount = totalAmount - totalTax;

  // 작품료 / AI 툴 지원비 분리
  const workFeeItems = settlement.items.filter((i) => i.itemType !== "AI_TOOL_SUPPORT");
  const aiFeeItems = settlement.items.filter((i) => i.itemType === "AI_TOOL_SUPPORT");
  const workFeeTotal = workFeeItems.reduce((s, i) => s + Number(i.finalAmount), 0);
  const aiFeeTotal = aiFeeItems.reduce((s, i) => s + Number(i.finalAmount), 0);

  // 기간 포맷
  const startDate = new Date(settlement.startDate);
  const endDate = new Date(settlement.endDate);
  const periodStr = `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${startDate.getDate()}일 ~ ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;

  // 귀속연월
  const taxYear = startDate.getFullYear();
  const taxMonth = startDate.getMonth() + 1;

  return NextResponse.json({
    data: {
      // 원천징수 영수증 정보
      receiptNo: `WT-${taxYear}${String(taxMonth).padStart(2, "0")}-${settlement.id.slice(-6).toUpperCase()}`,
      taxYear,
      taxMonth,

      // 지급자 정보 (회사)
      payer: {
        name: "함께봄 주식회사",
        businessNo: "",  // 사업자등록번호 (설정에서 관리)
        representative: "",
        address: "",
      },

      // 소득자 정보
      recipient: {
        name: settlement.star.name,
        chineseName: settlement.star.chineseName,
        idNumber: settlement.star.idNumber ? maskIdNumber(settlement.star.idNumber) : null,
        idNumberFull: user.role === "ADMIN" ? settlement.star.idNumber : null,
        phone: settlement.star.phone,
        email: settlement.star.email,
        bankName: settlement.star.bankName,
        bankAccount: settlement.star.bankAccount,
      },

      // 소득 내역
      income: {
        type: "사업소득 (940909)", // 소득 유형 코드
        period: periodStr,
        workFee: workFeeTotal,
        aiToolFee: aiFeeTotal,
        totalAmount,
        videoCount: workFeeItems.length,
      },

      // 세금 내역
      tax: {
        incomeTaxRate: 3,
        localTaxRate: 0.3,
        totalRate: 3.3,
        incomeTax,
        localTax,
        totalTax,
      },

      // 실지급액
      netAmount,

      // 정산 상태
      settlement: {
        id: settlement.id,
        status: settlement.status,
        paymentDate: settlement.paymentDate,
        confirmedAt: settlement.confirmedAt,
      },
    },
  });
}

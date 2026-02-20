import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SettlementDocument } from "@/components/settlement/settlement-document";
import {
  calculateTax,
  maskIdNumber,
  generatePdfFilename,
} from "@/lib/settlement-utils";
import "@/lib/pdf-fonts";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "true";

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: {
      star: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          idNumber: true,
          bankName: true,
          bankAccount: true,
          externalId: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
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
      {
        error: {
          code: "FORBIDDEN",
          message: "본인의 정산만 조회할 수 있습니다.",
        },
      },
      { status: 403 }
    );
  }

  // 회사명 조회 (SystemSettings fallback)
  let companyName = "(주) 멘토뱅크";
  const companySetting = await prisma.systemSettings
    .findUnique({
      where: { key: "company_name" },
    })
    .catch(() => null);
  if (companySetting) companyName = companySetting.value;

  // 정산 항목 → PDF 항목 변환 (세금 계산 포함)
  const pdfItems = settlement.items.map((item) => {
    const preTaxAmount = Number(item.finalAmount);
    const { totalTax, netAmount } = calculateTax(preTaxAmount);
    return {
      description:
        item.description ??
        (item.itemType === "AI_TOOL_SUPPORT" ? "AI 툴 지원비" : "작품료"),
      preTaxAmount,
      taxAmount: totalTax,
      netAmount,
    };
  });

  const totalPreTax = pdfItems.reduce(
    (sum, item) => sum + item.preTaxAmount,
    0
  );
  const totalTax = pdfItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalNet = pdfItems.reduce((sum, item) => sum + item.netAmount, 0);

  // 지급일 포맷
  const paymentDate = settlement.paymentDate
    ? new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(settlement.paymentDate)
    : undefined;

  // PDF 스트림 생성
  const element = React.createElement(SettlementDocument, {
    year: settlement.year,
    month: settlement.month,
    starName: settlement.star.name,
    phone: settlement.star.phone,
    email: settlement.star.email,
    idNumber: settlement.star.idNumber
      ? maskIdNumber(settlement.star.idNumber)
      : undefined,
    paymentDate,
    bankName: settlement.star.bankName,
    bankAccount: settlement.star.bankAccount,
    companyName,
    items: pdfItems,
    totalPreTax,
    totalTax,
    totalNet,
  });

  // SettlementDocument wraps <Document> internally; narrow for renderToStream's DocumentProps constraint
  const stream = await renderToStream(
    element as unknown as Parameters<typeof renderToStream>[0]
  );

  // Node.js Readable → Web ReadableStream 변환
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err: Error) => controller.error(err));
    },
  });

  const filename = generatePdfFilename(
    settlement.year,
    settlement.month,
    settlement.star.name,
    settlement.star.externalId
  );

  // ASCII-safe fallback filename for older/strict HTTP clients
  const asciiFilename = `${settlement.year}-${String(settlement.month).padStart(2, "0")}_settlement.pdf`;

  const headers: Record<string, string> = {
    "Content-Type": isDownload ? "application/octet-stream" : "application/pdf",
    "Content-Disposition": isDownload
      ? `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
  };

  return new Response(webStream, { headers });
}

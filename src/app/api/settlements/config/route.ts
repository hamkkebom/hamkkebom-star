import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { updateSettlementConfigSchema } from "@/lib/validations/settlement";

// GET /api/settlements/config — returns all settlement config settings
// Requires authentication (any role)
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const settings = await prisma.systemSettings.findMany({
    orderBy: { key: "asc" },
  });

  // If no settings exist yet, seed defaults
  if (settings.length === 0) {
    const defaults = [
      { key: "ai_tool_support_fee", value: "0", label: "AI 툴 지원비 (원)" },
      { key: "tax_rate", value: "3.3", label: "세율 (%)" },
      { key: "company_name", value: "(주) 멘토뱅크", label: "회사명" },
    ];
    await prisma.systemSettings.createMany({ data: defaults });
    const seeded = await prisma.systemSettings.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ data: seeded });
  }

  return NextResponse.json({ data: settings });
}

// PATCH /api/settlements/config — update a single setting by key
// Requires ADMIN role
export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 설정을 변경할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = updateSettlementConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  const { key, value } = parsed.data;
  const setting = await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return NextResponse.json({ data: setting });
}

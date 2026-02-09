import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createPortfolioItemSchema } from "@/lib/validations/portfolio";

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 포트폴리오 항목을 추가할 수 있습니다." } },
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

  const parsed = createPortfolioItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  try {
    let portfolio = await prisma.portfolio.findUnique({ where: { userId: user.id } });

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({ data: { userId: user.id } });
    }

    const maxItem = await prisma.portfolioItem.findFirst({
      where: { portfolioId: portfolio.id },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      select: { sortOrder: true },
    });

    const created = await prisma.portfolioItem.create({
      data: {
        portfolioId: portfolio.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        thumbnailUrl: parsed.data.thumbnailUrl ?? null,
        videoUrl: parsed.data.videoUrl ?? null,
        sortOrder: (maxItem?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "포트폴리오 항목 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { reorderItemsSchema } from "@/lib/validations/portfolio";

export async function PATCH(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 포트폴리오 항목 순서를 변경할 수 있습니다." } },
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

  const parsed = reorderItemsSchema.safeParse(body);

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

  const portfolio = await prisma.portfolio.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
    },
  });

  if (!portfolio) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "포트폴리오를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const ownedItems = await prisma.portfolioItem.findMany({
    where: {
      portfolioId: portfolio.id,
      id: { in: parsed.data.orderedIds },
    },
    select: { id: true },
  });

  if (ownedItems.length !== parsed.data.orderedIds.length) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "정렬 항목 중 일부가 본인 포트폴리오에 존재하지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        prisma.portfolioItem.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ data: { reordered: parsed.data.orderedIds.length } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "포트폴리오 항목 정렬 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

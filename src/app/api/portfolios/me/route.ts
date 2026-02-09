import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { updatePortfolioSchema } from "@/lib/validations/portfolio";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 포트폴리오를 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  let portfolio = await prisma.portfolio.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: { userId: user.id },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  }

  return NextResponse.json({ data: portfolio });
}

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
      { error: { code: "FORBIDDEN", message: "STAR만 포트폴리오를 수정할 수 있습니다." } },
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

  const parsed = updatePortfolioSchema.safeParse(body);

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
    const data = {
      ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
      ...(parsed.data.showreel !== undefined ? { showreel: parsed.data.showreel } : {}),
      ...(parsed.data.website !== undefined ? { website: parsed.data.website } : {}),
      ...(parsed.data.socialLinks !== undefined
        ? {
            socialLinks:
              parsed.data.socialLinks === null
                ? Prisma.DbNull
                : (parsed.data.socialLinks as Prisma.InputJsonValue),
          }
        : {}),
    };

    const portfolio = await prisma.portfolio.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...data,
      },
      update: data,
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json({ data: portfolio });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "포트폴리오 수정 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { userId } = await params;

  const portfolio = await prisma.portfolio.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!portfolio) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "포트폴리오를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: portfolio });
}

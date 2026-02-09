import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

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
      star: { select: { id: true, name: true, email: true, baseRate: true } },
      items: {
        include: {
          submission: {
            select: {
              id: true,
              versionTitle: true,
              version: true,
              status: true,
              createdAt: true,
            },
          },
        },
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
      { error: { code: "FORBIDDEN", message: "본인 정산만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: settlement });
}

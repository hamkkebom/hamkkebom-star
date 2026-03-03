import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  // 1. 인증
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  // 2. 권한 (ADMIN only)
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  // 3. 파라미터 추출
  const { id } = await params;

  // 4. DB 조회 — videoId에 해당하는 이벤트 로그
  const events = await prisma.videoEventLog.findMany({
    where: { videoId: id },
    orderBy: { createdAt: "desc" },
  });

  // 5. 응답 (이벤트 없어도 빈 배열 반환)
  return NextResponse.json({ data: events });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  let body: { approved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "잘못된 요청입니다." } },
      { status: 400 }
    );
  }

  if (typeof body.approved !== "boolean") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "approved 값이 필요합니다." } },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isApproved: body.approved },
    select: {
      id: true,
      name: true,
      email: true,
      isApproved: true,
    },
  });

  return NextResponse.json(updated);
}

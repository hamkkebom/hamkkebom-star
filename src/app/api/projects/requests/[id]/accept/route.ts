import { NextResponse } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 수락할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const req = await tx.projectRequest.findUnique({
        where: { id },
        include: { _count: { select: { assignments: true } } },
      });

      if (!req) {
        throw { code: "NOT_FOUND", message: "요청을 찾을 수 없습니다.", status: 404 };
      }

      if (req.status !== RequestStatus.OPEN) {
        throw { code: "BAD_REQUEST", message: "수락 가능한 상태가 아닙니다.", status: 400 };
      }

      const existing = await tx.projectAssignment.findUnique({
        where: { starId_requestId: { starId: user.id, requestId: id } },
      });

      if (existing) {
        throw { code: "CONFLICT", message: "이미 수락한 요청입니다.", status: 409 };
      }

      if (req._count.assignments >= req.maxAssignees) {
        throw { code: "BAD_REQUEST", message: "정원이 가득 찼습니다.", status: 400 };
      }

      const assignment = await tx.projectAssignment.create({
        data: { starId: user.id, requestId: id },
        include: {
          star: { select: { id: true, name: true, email: true } },
          request: { select: { id: true, title: true } },
        },
      });

      // 정원 도달 시 FULL로 변경
      if (req._count.assignments + 1 >= req.maxAssignees) {
        await tx.projectRequest.update({
          where: { id },
          data: { status: RequestStatus.FULL },
        });
      }

      return assignment;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && "status" in error) {
      const e = error as { code: string; message: string; status: number };
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "수락 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

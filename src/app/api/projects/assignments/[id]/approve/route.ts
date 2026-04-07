import { NextResponse } from "next/server";
import { AssignmentStatus, RequestStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.projectAssignment.findUnique({
        where: { id },
        include: {
          request: { select: { id: true, title: true, maxAssignees: true, deadline: true, status: true } },
        },
      });

      if (!assignment) {
        throw { code: "NOT_FOUND", message: "배정을 찾을 수 없습니다.", status: 404 };
      }

      if (assignment.status !== AssignmentStatus.PENDING_APPROVAL) {
        throw { code: "CONFLICT", message: "승인 대기 상태가 아닙니다.", status: 409 };
      }

      // 마감일 경과 체크
      if (assignment.request.deadline && new Date(assignment.request.deadline) < new Date()) {
        // 자동으로 CLOSED 상태로 변경
        if (assignment.request.status === "OPEN") {
          await tx.projectRequest.update({
            where: { id: assignment.requestId },
            data: { status: RequestStatus.CLOSED },
          });
        }
        // 해당 assignment를 REJECTED로 변경
        await tx.projectAssignment.update({
          where: { id },
          data: { status: AssignmentStatus.REJECTED, reviewedAt: new Date(), reviewedById: user.id },
        });
        throw { code: "BAD_REQUEST", message: "마감일이 지난 프로젝트는 승인할 수 없습니다.", status: 400 };
      }

      // 프로젝트 상태가 OPEN이 아니면 승인 불가
      if (assignment.request.status !== "OPEN" && assignment.request.status !== "FULL") {
        throw { code: "BAD_REQUEST", message: "종료되거나 취소된 프로젝트는 승인할 수 없습니다.", status: 400 };
      }

      // Race-condition safe: count active assignments within transaction
      const activeCount = await tx.projectAssignment.count({
        where: {
          requestId: assignment.requestId,
          status: {
            in: [
              AssignmentStatus.ACCEPTED,
              AssignmentStatus.IN_PROGRESS,
              AssignmentStatus.SUBMITTED,
              AssignmentStatus.COMPLETED,
            ],
          },
        },
      });

      if (activeCount >= assignment.request.maxAssignees) {
        throw { code: "CONFLICT", message: "정원이 가득 찼습니다.", status: 409 };
      }

      const updated = await tx.projectAssignment.update({
        where: { id },
        data: {
          status: AssignmentStatus.ACCEPTED,
          reviewedAt: new Date(),
          reviewedById: user.id,
        },
        include: {
          star: { select: { id: true, name: true, email: true } },
          request: { select: { id: true, title: true } },
        },
      });

      // If capacity reached after this approval, set request to FULL
      if (activeCount + 1 >= assignment.request.maxAssignees) {
        await tx.projectRequest.update({
          where: { id: assignment.requestId },
          data: { status: RequestStatus.FULL },
        });
      }

      return updated;
    });

    void createAuditLog({
      actorId: user.id,
      action: "APPROVE_ASSIGNMENT",
      entityType: "ProjectAssignment",
      entityId: id,
      metadata: { targetName: result.star?.name, targetTitle: result.request?.title },
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && "status" in error) {
      const e = error as { code: string; message: string; status: number };
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "승인 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

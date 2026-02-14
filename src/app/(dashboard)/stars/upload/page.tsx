import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UploadPageClient } from "./upload-client";

export default async function UploadPage() {
  const user = await getAuthUser();

  if (!user || user.role !== "STAR") {
    notFound();
  }

  // 1. 내가 수락한 프로젝트 (진행중, 완료 등)
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      starId: user.id,
    },
    include: {
      request: {
        select: {
          id: true,
          title: true,
          deadline: true,
          requirements: true,
          referenceUrls: true,
          categories: true,
          maxAssignees: true,
          status: true, // Request 자체의 상태도 필요
          estimatedBudget: true, // 예산 정보도 있으면 좋음
          _count: {
            select: {
              assignments: true,
            }
          }
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // 2. 전체 프로젝트 (탐색용 - 모든 상태)
  // 내가 참여했는지 여부를 알기 위해 assignments를 include (내 starId로 필터)
  const allRequests = await prisma.projectRequest.findMany({
    include: {
      assignments: {
        where: { starId: user.id },
        select: { status: true }
      }
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const assignmentItems = assignments.map((a) => ({
    id: a.id,
    requestId: a.request.id,
    requestTitle: a.request.title,
    deadline: a.request.deadline.toISOString(),
    status: a.status,
    requirements: a.request.requirements,
    referenceUrls: a.request.referenceUrls,
    categories: a.request.categories,
  }));

  const requestItems = allRequests.map((r) => {
    // 내 참여 상태 확인 (배열에 값이 있으면 참여중인 것)
    const myAssignment = r.assignments[0];
    const myAssignmentStatus = myAssignment ? myAssignment.status : null;

    return {
      id: r.id,
      title: r.title,
      deadline: r.deadline.toISOString(),
      categories: r.categories,
      requirements: r.requirements,
      referenceUrls: r.referenceUrls,
      maxAssignees: r.maxAssignees,
      status: r.status, // 프로젝트 모집 상태 (OPEN, FULL, CLOSED)
      myAssignmentStatus, // 나의 참여 상태 (null이면 미참여)
    };
  });

  return <UploadPageClient assignments={assignmentItems} openRequests={requestItems} />;
}

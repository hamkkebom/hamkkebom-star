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
          status: true,
          estimatedBudget: true,
          _count: {
            select: {
              assignments: true,
            }
          }
        },
      },
      // 최신 제출물 1개 가져오기 (썸네일용)
      submissions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { thumbnailUrl: true }
      }
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
    thumbnailUrl: a.submissions[0]?.thumbnailUrl || null,
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

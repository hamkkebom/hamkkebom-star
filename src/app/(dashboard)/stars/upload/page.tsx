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
        select: { status: true },
        take: 1
      },
      _count: {
        select: { assignments: true }
      }
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // 3. 모든 카테고리 (카테고리 선택용)
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 4. 모든 상담사 (상담사 선택용)
  const counselors = await prisma.counselor.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  // 5. Transform assignments data with safety check
  const formattedAssignments = assignments.map((a) => ({
    id: a.id,
    requestId: a.request?.id,
    requestTitle: a.request?.title || "삭제된 의뢰",
    deadline: a.request?.deadline?.toISOString() || "",
    status: a.status,
    requirements: a.request?.requirements || null,
    referenceUrls: a.request?.referenceUrls || [],
    categories: a.request?.categories || [],
    thumbnailUrl: a.submissions[0]?.thumbnailUrl || null,
  }));

  // 6. Transform open requests
  const formattedOpenRequests = allRequests.map((req) => {
    // Check if the current user has an assignment for this request
    // This is an in-memory check to avoid complex query if meaningful
    const myAssignment = assignments.find((a) => a.requestId === req.id);
    const myStatus = myAssignment ? myAssignment.status : null;

    return {
      id: req.id,
      title: req.title,
      deadline: req.deadline.toISOString(),
      categories: req.categories,
      requirements: req.requirements,
      referenceUrls: req.referenceUrls,
      maxAssignees: req.maxAssignees,
      currentCount: req._count?.assignments || 0,
      status: req.status,
      myAssignmentStatus: myStatus,
    };
  });

  return (
    <div className="container py-8 max-w-6xl">
      <UploadPageClient
        assignments={formattedAssignments}
        openRequests={formattedOpenRequests}
        categories={categories}
        counselors={counselors}
      />
    </div>
  );
}

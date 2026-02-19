import { prisma } from "@/lib/prisma";
import { VideoManagerClient } from "@/components/video/video-manager/video-manager-client";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 카테고리 목록 가져오기
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 상담사 목록 가져오기
  const counselors = await prisma.counselor.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  return (
    <div>
      <VideoManagerClient submissionId={id} categories={categories} counselors={counselors} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UploadPageClient } from "./upload-client";

export default async function UploadPage() {
  const user = await getAuthUser();

  if (!user || user.role !== "STAR") {
    notFound();
  }

  const assignments = await prisma.projectAssignment.findMany({
    where: {
      starId: user.id,
      status: {
        in: ["ACCEPTED", "IN_PROGRESS"],
      },
    },
    include: {
      request: {
        select: {
          id: true,
          title: true,
          deadline: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const items = assignments.map((a) => ({
    id: a.id,
    requestTitle: a.request.title,
    deadline: a.request.deadline.toISOString(),
    status: a.status,
  }));

  return <UploadPageClient assignments={items} />;
}

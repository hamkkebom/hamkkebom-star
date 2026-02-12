import { SubmissionDetailClient } from "./submission-detail-client";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <SubmissionDetailClient submissionId={id} />
    </div>
  );
}

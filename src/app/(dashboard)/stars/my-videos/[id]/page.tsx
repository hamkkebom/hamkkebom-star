import { VideoManagerClient } from "@/components/video/video-manager/video-manager-client";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <VideoManagerClient submissionId={id} />
    </div>
  );
}

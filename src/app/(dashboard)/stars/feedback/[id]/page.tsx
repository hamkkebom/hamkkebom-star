import { SubmissionDetailClient } from "../../my-videos/[id]/submission-detail-client";

export default async function FeedbackDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <div className="mx-auto max-w-5xl">
            {/* Reusing existing SubmissionDetailClient which is feedback-focused */}
            <SubmissionDetailClient submissionId={id} />
        </div>
    );
}

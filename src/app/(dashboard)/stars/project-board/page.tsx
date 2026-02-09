import { FilterBar } from "@/components/project/filter-bar";
import { RequestList } from "@/components/project/request-list";

export default async function ProjectBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status, search } = await searchParams;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">제작요청 게시판</h1>
      <p className="text-sm text-muted-foreground">
        새로운 제작 요청을 확인하고 수락하세요.
      </p>
      <FilterBar />
      <RequestList status={status ?? "ALL"} search={search ?? ""} />
    </div>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type RequestStatus = "OPEN" | "FULL" | "CLOSED" | "CANCELLED";

export type RequestCardItem = {
  id: string;
  title: string;
  categories: string[];
  deadline: string | Date;
  estimatedBudget: string | number | null;
  maxAssignees: number;
  currentAssignees: number;
  status: RequestStatus;
};

const statusMap: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "모집중", variant: "default" },
  FULL: { label: "정원마감", variant: "secondary" },
  CLOSED: { label: "종료", variant: "outline" },
  CANCELLED: { label: "취소", variant: "destructive" },
};

function formatBudget(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "미정";
  }

  const numericValue = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(numericValue)) {
    return "미정";
  }

  return `${new Intl.NumberFormat("ko-KR").format(numericValue)}원`;
}

function formatDeadline(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "미정";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDday(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "마감";
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

export function RequestCard({ request }: { request: RequestCardItem }) {
  return (
    <Link href={`/stars/request-detail/${request.id}`}>
      <Card className="h-full transition-colors hover:border-primary/60">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg">{request.title}</CardTitle>
            <Badge variant={statusMap[request.status].variant}>{statusMap[request.status].label}</Badge>
          </div>
          <CardDescription>
            마감일 {formatDeadline(request.deadline)}
            {(() => {
              const dday = getDday(request.deadline);
              if (!dday) return null;
              const isUrgent = dday === "마감" || dday === "D-Day" || (dday.startsWith("D-") && Number(dday.slice(2)) <= 3);
              return (
                <span className={`ml-2 font-semibold ${isUrgent ? "text-destructive" : "text-primary"}`}>
                  {dday}
                </span>
              );
            })()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {request.categories.map((category) => (
              <Badge key={`${request.id}-${category}`} variant="outline">
                {category}
              </Badge>
            ))}
          </div>
          {request.estimatedBudget !== null && request.estimatedBudget !== undefined && request.estimatedBudget !== "" && (
            <div className="text-sm text-muted-foreground">예산 {formatBudget(request.estimatedBudget)}</div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            수락 인원 {request.currentAssignees}/{request.maxAssignees}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}

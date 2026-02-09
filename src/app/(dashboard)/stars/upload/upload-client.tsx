"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { SubmissionList } from "@/components/video/submission-list";

type AssignmentItem = {
  id: string;
  requestTitle: string;
  deadline: string;
  status: string;
};

function formatDeadline(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function UploadPageClient({
  assignments,
}: {
  assignments: AssignmentItem[];
}) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [versionSlot, setVersionSlot] = useState(1);
  const [versionTitle, setVersionTitle] = useState("");

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">영상 업로드</h1>
        <p className="text-sm text-muted-foreground">
          배정된 프로젝트를 선택하고 영상을 업로드하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>업로드 설정</CardTitle>
          <CardDescription>배정된 프로젝트와 버전을 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>프로젝트 배정</Label>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                수락한 프로젝트가 없습니다. 프로젝트 게시판에서 요청을 수락해 주세요.
              </p>
            ) : (
              <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="프로젝트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.requestTitle} (마감: {formatDeadline(assignment.deadline)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedAssignment && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>버전 슬롯 (1~5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={versionSlot}
                  onChange={(e) => setVersionSlot(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>버전 제목 (선택)</Label>
                <Input
                  placeholder="예: 초안, 수정본 등"
                  value={versionTitle}
                  onChange={(e) => setVersionTitle(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAssignmentId && (
        <UploadDropzone
          assignmentId={selectedAssignmentId}
          versionSlot={versionSlot}
          versionTitle={versionTitle || undefined}
        />
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">내 제출물</h2>
        <SubmissionList />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/video/upload-dropzone";
import { SubmissionList } from "@/components/video/submission-list";
import { ClipboardList, FolderOpen } from "lucide-react";
import Link from "next/link";

type AssignmentItem = {
  id: string;
  requestTitle: string;
  deadline: string;
  status: string;
  requirements: string | null;
  referenceUrls: string[];
  categories: string[];
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
  const [description, setDescription] = useState("");

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
              <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-10 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">수락한 프로젝트가 없습니다</p>
                  <p className="text-sm text-muted-foreground">
                    영상을 업로드하려면 먼저 제작요청 게시판에서 프로젝트를 수락해야 합니다.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/stars/project-board" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    제작요청 게시판으로 이동
                  </Link>
                </Button>
              </div>
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
            <>
              {/* 프로젝트 요구사항 컨텍스트 표시 */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  프로젝트 정보
                </h4>

                {selectedAssignment.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAssignment.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedAssignment.requirements && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">요구사항</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedAssignment.requirements}
                    </p>
                  </div>
                )}

                {selectedAssignment.referenceUrls.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">참고 URL</p>
                    <ul className="space-y-0.5">
                      {selectedAssignment.referenceUrls.map((url, idx) => (
                        <li key={`ref-${idx}`}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!selectedAssignment.requirements &&
                  selectedAssignment.referenceUrls.length === 0 &&
                  selectedAssignment.categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      등록된 프로젝트 상세 정보가 없습니다.
                    </p>
                  )}
              </div>

              {/* 영상 제목 */}
              <div className="space-y-2">
                <Label>영상 제목 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="예: 함께봄 봄맞이 숏폼 광고, 제품 소개 영상 v2 등"
                  value={versionTitle}
                  onChange={(e) => setVersionTitle(e.target.value)}
                  maxLength={100}
                />
                {versionTitle.length === 0 && selectedAssignment && (
                  <p className="text-xs text-destructive">영상 제목은 필수입니다.</p>
                )}
              </div>

              {/* 버전 슬롯 */}
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

              {/* 제작 설명/메모 */}
              <div className="space-y-2">
                <Label>제작 설명 / 메모 (선택)</Label>
                <Textarea
                  placeholder="제작 의도, 수정 내용, 참고사항 등을 자유롭게 작성하세요."
                  className="min-h-[100px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                />
                {description.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length} / 2,000
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedAssignmentId && versionTitle.trim().length > 0 && (
        <UploadDropzone
          assignmentId={selectedAssignmentId}
          versionSlot={versionSlot}
          versionTitle={versionTitle}
          description={description || undefined}
        />
      )}

      {selectedAssignmentId && versionTitle.trim().length === 0 && (
        <div className="rounded-xl border border-dashed px-4 py-14 text-center">
          <p className="text-sm text-muted-foreground">영상 제목을 입력하면 업로드 영역이 표시됩니다.</p>
          <p className="mt-2 text-xs text-muted-foreground">지원 형식: MP4, MOV, AVI, WebM · 최대 6GB</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">최근 업로드</h2>
          <Link href="/stars/my-videos" className="text-sm text-primary hover:underline">전체 보기</Link>
        </div>
        <SubmissionList limit={3} />
      </div>
    </div>
  );
}

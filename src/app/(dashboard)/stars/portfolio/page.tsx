"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  sortOrder: number;
};

type Portfolio = {
  id: string;
  bio: string | null;
  showreel: string | null;
  website: string | null;
  socialLinks: Record<string, string> | null;
  items: PortfolioItem[];
};

export default function PortfolioPage() {
  const queryClient = useQueryClient();

  // Portfolio info editing
  const [editingInfo, setEditingInfo] = useState(false);
  const [bio, setBio] = useState("");
  const [showreel, setShowreel] = useState("");
  const [website, setWebsite] = useState("");

  // Add item dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portfolio-me"],
    queryFn: async () => {
      const res = await fetch("/api/portfolios/me", { cache: "no-store" });
      if (!res.ok) throw new Error("포트폴리오를 불러오지 못했습니다.");
      const json = (await res.json()) as { data: Portfolio };
      return json.data;
    },
  });

  const updateInfoMutation = useMutation({
    mutationFn: async (body: { bio?: string; showreel?: string | null; website?: string | null }) => {
      const res = await fetch("/api/portfolios/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("포트폴리오 수정에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("포트폴리오 정보가 수정되었습니다.");
      setEditingInfo(false);
      await queryClient.invalidateQueries({ queryKey: ["portfolio-me"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "오류가 발생했습니다."),
  });

  const addItemMutation = useMutation({
    mutationFn: async (body: { title: string; description?: string; videoUrl?: string | null }) => {
      const res = await fetch("/api/portfolios/me/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("항목 추가에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("작품이 추가되었습니다.");
      setAddDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewVideoUrl("");
      await queryClient.invalidateQueries({ queryKey: ["portfolio-me"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "오류가 발생했습니다."),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/portfolios/me/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("항목 삭제에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("작품이 삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["portfolio-me"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "오류가 발생했습니다."),
  });

  function startEditingInfo() {
    if (!data) return;
    setBio(data.bio ?? "");
    setShowreel(data.showreel ?? "");
    setWebsite(data.website ?? "");
    setEditingInfo(true);
  }

  function handleSaveInfo() {
    updateInfoMutation.mutate({
      bio: bio.trim(),
      showreel: showreel.trim() || null,
      website: website.trim() || null,
    });
  }

  function handleAddItem() {
    if (!newTitle.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    addItemMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      videoUrl: newVideoUrl.trim() || null,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
        포트폴리오를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">포트폴리오</h1>
          <p className="text-sm text-muted-foreground">포트폴리오를 관리하고 작품을 추가하세요.</p>
        </div>
        <div className="flex gap-2">
          {!editingInfo && (
            <Button variant="outline" onClick={startEditingInfo}>
              정보 수정
            </Button>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>작품 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>작품 추가</DialogTitle>
                <DialogDescription>포트폴리오에 새 작품을 추가합니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>제목 *</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="작품 제목" />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="작품에 대한 설명" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>영상 URL</Label>
                  <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="https://..." />
                </div>
                <Button onClick={handleAddItem} disabled={addItemMutation.isPending} className="w-full">
                  {addItemMutation.isPending ? "추가 중..." : "추가"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 포트폴리오 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">포트폴리오 정보</CardTitle>
          <CardDescription>소개, 쇼릴, 웹사이트 등을 설정하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {editingInfo ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>소개</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자기소개를 작성하세요" rows={4} />
              </div>
              <div className="space-y-2">
                <Label>쇼릴 URL</Label>
                <Input value={showreel} onChange={(e) => setShowreel(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>웹사이트</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveInfo} disabled={updateInfoMutation.isPending}>
                  {updateInfoMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button variant="ghost" onClick={() => setEditingInfo(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">소개</p>
                <p className="whitespace-pre-line text-sm leading-7">{data.bio || "미설정"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">쇼릴</p>
                {data.showreel ? (
                  <a href={data.showreel} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {data.showreel}
                  </a>
                ) : (
                  <p className="text-sm">미설정</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">웹사이트</p>
                {data.website ? (
                  <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {data.website}
                  </a>
                ) : (
                  <p className="text-sm">미설정</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 작품 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">작품 목록</CardTitle>
          <CardDescription>{data.items.length}개의 작품</CardDescription>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">아직 작품이 없습니다. &quot;작품 추가&quot; 버튼으로 시작하세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.videoUrl && (
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        영상 보기 ↗
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("이 작품을 삭제하시겠습니까?")) {
                        deleteItemMutation.mutate(item.id);
                      }
                    }}
                    disabled={deleteItemMutation.isPending}
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

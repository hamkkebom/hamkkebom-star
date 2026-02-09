"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

export function AcceptRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/requests/${requestId}/accept`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        throw new Error(payload.error?.message ?? "요청 수락에 실패했습니다.");
      }

      toast.success("요청을 수락했습니다.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "요청 수락 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button onClick={handleAccept} disabled={isSubmitting}>
      {isSubmitting ? "수락 중..." : "요청 수락하기"}
    </Button>
  );
}

import { Suspense } from "react";
import { VideosBrowser } from "@/components/video/videos-browser";

export const metadata = {
    title: "영상 목록",
    description: "함께봄스타의 모든 영상을 확인하세요.",
};

export default function VideosPage() {
    return (
        <div className="flex h-full w-full flex-col">
            <Suspense fallback={<div className="min-h-screen" />}>
                <VideosBrowser />
            </Suspense>
        </div>
    );
}

import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { VideosBrowser } from "@/components/video/videos-browser";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="py-20 text-center">Loading videos...</div>}>
          <VideosBrowser />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

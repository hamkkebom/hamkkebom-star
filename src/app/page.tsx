import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import VideosPage from "./(videos)/videos/page";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <VideosPage />
      </main>
      <PublicFooter />
    </div>
  );
}

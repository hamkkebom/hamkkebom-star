import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicBottomNav } from "@/components/layout/public-bottom-nav";

export default function VideosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <PublicFooter />
      <PublicBottomNav />
    </div>
  );
}

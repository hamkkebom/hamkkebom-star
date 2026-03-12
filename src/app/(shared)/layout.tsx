import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicBottomNav } from "@/components/layout/public-bottom-nav";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 relative">
        {/* Subtle radial gradient overlay for depth — matches space theme */}
        <div className="pointer-events-none fixed inset-0 -z-[1]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/60" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,oklch(0.3_0.08_230/0.15),transparent_70%)]" />
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 py-6 md:py-10 pb-20 md:pb-12">
          {children}
        </div>
      </main>
      <PublicFooter />
      <PublicBottomNav />
    </div>
  );
}

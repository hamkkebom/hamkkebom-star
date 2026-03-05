import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNavStar } from "@/components/layout/bottom-nav-star";
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser({ skipApprovalCheck: true });

  if (!user || user.role !== "STAR") {
    redirect("/");
  }

  if (!user.isApproved) {
    redirect("/auth/pending-approval");
  }

  return (
    <div className="flex h-[100dvh]">
      <div className="hidden md:block h-[100dvh]">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header isAdmin={false} />
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+64px+env(safe-area-inset-bottom,16px))] md:p-6">
          {children}
        </main>
        <BottomNavStar />
      </div>
    </div>
  );
}

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Header } from "@/components/layout/header";
import { BottomNavAdmin } from "@/components/layout/bottom-nav-admin";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { UpdatePrompt } from "@/components/pwa/update-prompt";
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser({ skipApprovalCheck: true });

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  if (!user.isApproved) {
    redirect("/auth/pending-approval");
  }

  return (
    <div className="flex h-[100dvh]">
      <div className="hidden md:block h-[100dvh]">
        <AdminSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header isAdmin={true} />
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+64px+env(safe-area-inset-bottom,16px))] md:p-6">
          {children}
        </main>
        <BottomNavAdmin />
        <OfflineBanner />
        <UpdatePrompt />
      </div>
    </div>
  );
}

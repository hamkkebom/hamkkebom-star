import { StarTopNav } from "@/components/layout/star-top-nav";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdatePrompt } from "@/components/pwa/update-prompt";
import { PushPermission } from "@/components/pwa/push-permission";
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser({ skipApprovalCheck: true, skipBanCheck: true });

  if (!user) {
    redirect("/");
  }

  // Ban → Suspend → Role → Approve 순서 체크 (Momus 리뷰 반영)
  if (user.isBanned) {
    redirect("/auth/banned");
  }

  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    redirect("/auth/suspended");
  }

  if (user.role !== "STAR") {
    redirect("/");
  }

  if (!user.isApproved) {
    redirect("/auth/pending-approval");
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <StarTopNav />
      <main className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+64px+env(safe-area-inset-bottom,16px))] md:p-6 md:pb-6">
        {children}
      </main>
      <OfflineBanner />
      <InstallPrompt />
      <UpdatePrompt />
      <PushPermission />
    </div>
  );
}

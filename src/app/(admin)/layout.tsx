import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Header } from "@/components/layout/header";
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
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

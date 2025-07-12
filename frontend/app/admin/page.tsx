import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Check if user is admin
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8">
      <AdminHeader />
      <AdminDashboard />
    </div>
  );
}

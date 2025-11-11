import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch business information for sidebar
  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
    select: { name: true },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9fafb]">
      {/* Sidebar */}
      <Sidebar businessName={business?.name} userEmail={session.user.email} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#F5F2EF] flex">
      <Sidebar />
      <main className="flex-1 lg:ml-0 p-4 lg:p-6 pt-16 lg:pt-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

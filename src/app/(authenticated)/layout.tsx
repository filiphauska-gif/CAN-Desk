import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { PageTransition } from "@/components/layout/page-transition";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      {/* Aurora mesh background — gives the glass something to refract */}
      <div className="liquid-bg" aria-hidden />
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 lg:py-6 lg:pr-6 lg:pl-3 pt-16 overflow-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}

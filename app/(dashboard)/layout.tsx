import { AppSidebar } from "@/components/common/AppSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}

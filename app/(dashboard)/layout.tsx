import { AppSidebar } from "@/components/common/AppSidebar";
import { DataUpdateModal } from "@/components/modals/DataUpdateModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="relative flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.03),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,119,198,0.02),transparent_50%)]" />
        {children}
      </main>
      <DataUpdateModal />
    </div>
  );
}

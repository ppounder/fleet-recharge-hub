import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen } = useAppContext();

  return (
    <div
      className="min-h-screen bg-background"
      style={{ "--sidebar-width": sidebarOpen ? "16rem" : "4rem" } as React.CSSProperties}
    >
      <AppSidebar />
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <TopBar />
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

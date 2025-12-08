import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out pb-20 md:pb-0",
          sidebarCollapsed ? "md:ml-16" : "md:ml-80"
        )}
      >
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}

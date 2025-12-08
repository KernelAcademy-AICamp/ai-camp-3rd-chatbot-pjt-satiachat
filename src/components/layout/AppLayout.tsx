import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - always visible, collapsed on mobile */}
      <AppSidebar
        collapsed={isMobile ? true : sidebarCollapsed}
        onToggle={() => !isMobile && setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          (isMobile || sidebarCollapsed) ? "ml-[100px]" : "ml-80"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}

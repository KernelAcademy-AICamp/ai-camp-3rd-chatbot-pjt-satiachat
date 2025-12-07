import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Pill,
  BarChart3,
  MessageSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { title: "홈", url: "/dashboard", icon: LayoutDashboard },
  { title: "내정보", url: "/my-page", icon: User },
  { title: "약물", url: "/medications", icon: Pill },
  { title: "리포트", url: "/reports", icon: BarChart3 },
  { title: "게시판", url: "/board", icon: MessageSquare },
  { title: "설정", url: "/settings", icon: Settings },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.url ||
            (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "animate-pulse-soft")} />
              <span className="text-[9px] font-medium truncate">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Pill,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SatiaChatLogo, SatiaChatHorizontalLogo } from "@/components/ui/satiachat-logo";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Page", url: "/my-page", icon: User },
  { title: "Medications", url: "/medications", icon: Pill },
  { title: "Board", url: "/board", icon: MessageSquare },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "로그아웃 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-[100px]" : "w-80"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-[100px] border-b border-sidebar-border">
        {collapsed ? (
          <svg viewBox="0 0 42 36" width={84} height={72} xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
            <defs>
              <linearGradient id="satiachat-collapsed-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7FE7C4" />
                <stop offset="40%" stopColor="#7FE7C4" />
                <stop offset="75%" stopColor="#6CB8E0" />
                <stop offset="100%" stopColor="#577DFF" />
              </linearGradient>
            </defs>
            <g transform="translate(21, 20) scale(0.22)">
              <path
                d="M -60 -20 C -60 -55, -40 -75, 0 -75 C 40 -75, 65 -55, 65 -20 C 65 15, 50 45, 5 50 C -15 52, -30 48, -38 42 L -42 38 L -62 55 L -52 35 C -60 25, -60 10, -60 -20 Z"
                fill="url(#satiachat-collapsed-gradient)"
              />
              <g transform="translate(0, -10)">
                <path d="M -33 4 C -33 15, -26 34, 0 36 C 26 34, 33 15, 33 4 C 20 -3, -20 -3, -33 4 Z" fill="#F7F4ED" />
                <ellipse cx="0" cy="4" rx="33" ry="8" fill="#F7F4ED" />
                <g transform="translate(-4, 0) rotate(20)">
                  <path d="M 0 -46 C 12 -40, 15 -26, 11 -12 C 8 -5, 0 0, 0 0 C 0 0, -8 -5, -11 -12 C -15 -26, -12 -40, 0 -46 Z" fill="#F7F4ED" />
                  <line x1="0" y1="-2" x2="0" y2="-44" stroke="url(#satiachat-collapsed-gradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                  <path d="M 0 -14 Q 5 -18 8 -24" fill="none" stroke="url(#satiachat-collapsed-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                  <path d="M 0 -14 Q -5 -18 -8 -24" fill="none" stroke="url(#satiachat-collapsed-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                  <path d="M 0 -26 Q 4 -30 6 -35" fill="none" stroke="url(#satiachat-collapsed-gradient)" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
                  <path d="M 0 -26 Q -4 -30 -6 -35" fill="none" stroke="url(#satiachat-collapsed-gradient)" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
                </g>
              </g>
              <circle cx="32" cy="-38" r="6" fill="#577DFF" />
            </g>
          </svg>
        ) : (
          <div className="w-full flex justify-center pl-[252px]">
            <SatiaChatHorizontalLogo size="3xl" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto",
        collapsed ? "px-2 py-5 space-y-2.5" : "px-3 py-5 space-y-2.5"
      )}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center rounded-xl font-medium transition-all duration-300 ease-in-out",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground",
                collapsed
                  ? "justify-center px-4 py-4"
                  : "justify-start gap-3.5 px-4 py-4 text-lg"
              )}
            >
              <item.icon className={cn(
                "flex-shrink-0 w-8 h-8 transition-all duration-300",
                isActive && "animate-pulse-soft"
              )} />
              <span className={cn(
                "transition-all duration-300 whitespace-nowrap overflow-hidden",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      {user && (
        <div className={cn(
          "border-t border-sidebar-border",
          collapsed ? "px-2 py-3" : "px-3 py-3"
        )}>
          <div className={cn(
            "flex items-center mb-2",
            collapsed ? "justify-center" : "gap-3"
          )}>
            <div className={cn(
              "rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0",
              collapsed ? "w-8 h-8" : "w-10 h-10"
            )}>
              <User className={cn(
                "text-primary",
                collapsed ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm text-sidebar-foreground truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full hover:bg-destructive/10 hover:text-destructive",
              collapsed ? "justify-center h-10" : "justify-start"
            )}
          >
            <LogOut className={cn(
              "flex-shrink-0",
              collapsed ? "w-5 h-5" : "w-4 h-4"
            )} />
            {!collapsed && (
              <span className="ml-2 animate-fade-in">
                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className={cn(
        "border-t border-sidebar-border",
        collapsed ? "p-2" : "p-3"
      )}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={onToggle}
          className={cn(
            "w-full justify-center hover:bg-sidebar-accent",
            collapsed && "h-10"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

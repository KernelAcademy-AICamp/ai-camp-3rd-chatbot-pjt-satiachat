import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
  className?: string;
}

export function FloatingChatButton({
  isOpen,
  onClick,
  unreadCount = 0,
  className,
}: FloatingChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-4 z-40 lg:hidden",
        "w-14 h-14 rounded-full",
        "bg-gradient-to-br from-primary to-primary/80",
        "shadow-lg shadow-primary/30",
        "flex items-center justify-center",
        "text-white",
        "hover:scale-110 active:scale-95",
        "transition-all duration-300",
        className
      )}
      aria-label={isOpen ? "채팅 닫기" : "AI 코치와 대화하기"}
    >
      {isOpen ? (
        <X className="w-6 h-6" />
      ) : (
        <>
          <MessageCircle className="w-6 h-6" />
          {/* 새 메시지 뱃지 */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </>
      )}
    </button>
  );
}

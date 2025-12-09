import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMedicationChat } from "@/hooks/useMedicationChat";

export function MedicationChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading, clearMessages } = useMedicationChat();

  // 새 메시지가 오면 스크롤 (맨 아래로) - Dashboard와 동일한 방식
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    setInput("");
    await sendMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-3xl border border-border/50 shadow-lg overflow-hidden">
      {/* 헤더 - 전문 의료 상담 스타일 */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-950/20">
        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md bg-muted">
          <img
            src="/coaches/doctor.png"
            alt="의약품 전문 상담"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">의약품 전문 상담</h3>
          <p className="text-xs text-muted-foreground">위고비/마운자로 허가정보 기반</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">상담 가능</span>
        </div>
      </div>

      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 bg-muted">
                <img
                  src="/coaches/doctor.png"
                  alt="의약품 전문 상담"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-semibold text-foreground mb-2">의약품 상담을 시작하세요</h4>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                위고비, 마운자로의 효능, 용법, 주의사항 등 식약처 허가정보 기반의 전문 상담을 받아보세요.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-md"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={cn(
                  "text-[10px] mt-1.5",
                  message.role === "user" ? "text-white/70" : "text-muted-foreground"
                )}>
                  {new Date(message.timestamp).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-muted-foreground">분석 중...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="위고비/마운자로 관련 질문을 입력하세요..."
            className="flex-1 rounded-xl bg-background border-border focus:border-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          식약처 허가정보 기반 참고용 정보입니다. 실제 치료는 담당 의사와 상담하세요.
        </p>
      </div>
    </div>
  );
}

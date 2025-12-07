import { useState, useRef, useEffect } from "react";
import { Send, Stethoscope, Scale, Flame, Pill, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMedicationChat, type MedicationChatMessage } from "@/hooks/useMedicationChat";

const quickActions = [
  { icon: Scale, label: "체중 분석", query: "최근 체중 변화를 분석해줘", useRag: false },
  { icon: Flame, label: "칼로리 분석", query: "이번 주 칼로리 섭취 패턴을 알려줘", useRag: false },
  { icon: Pill, label: "약물 효과", query: "약물 복용이 체중에 미친 영향은?", useRag: true },  // RAG 필요
  { icon: TrendingDown, label: "진행 상황", query: "현재 다이어트 진행 상황을 평가해줘", useRag: false },
];

export function MedicationChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading, clearMessages } = useMedicationChat();

  // 새 메시지가 오면 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (messageText?: string, useRag: boolean = true) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    setInput("");
    await sendMessage(text, useRag);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-3xl border border-border/50 shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-r from-info/10 to-info/5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-info to-info/70 flex items-center justify-center shadow-md">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">AI 약물 상담</h3>
          <p className="text-xs text-muted-foreground">위고비 · 마운자로 전문 코칭</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 rounded-full">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs text-success font-medium">상담 가능</span>
        </div>
      </div>

      {/* 빠른 질문 버튼 */}
      <div className="p-3 border-b border-border bg-muted/20 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(action.query, action.useRag)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-medium text-foreground hover:border-info hover:bg-info/5 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed snap-start flex-shrink-0"
            >
              <action.icon className="w-3.5 h-3.5 text-info" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-info" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">약물 상담을 시작하세요</h4>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                위고비, 마운자로 등 비만 치료제에 대한 궁금증이나 복용 관련 조언을 받아보세요.
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
                    ? "bg-info text-white rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
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
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-info rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-info rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-info rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-muted-foreground">분석 중...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-border bg-muted/20">
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
            placeholder="약물, 체중, 식단에 대해 질문하세요..."
            className="flex-1 rounded-xl bg-background border-border focus:border-info"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl bg-info hover:bg-info/90 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          의료 조언이 아닌 참고용 정보입니다. 중요한 결정은 전문의와 상담하세요.
        </p>
      </div>
    </div>
  );
}

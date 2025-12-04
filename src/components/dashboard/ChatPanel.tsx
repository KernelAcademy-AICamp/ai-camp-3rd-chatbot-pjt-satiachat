import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Snowflake, Sun, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type CoachPersona = "cold" | "bright" | "strict";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const personaConfig: Record<CoachPersona, { icon: typeof Snowflake; label: string; color: string }> = {
  cold: { icon: Snowflake, label: "Cool & Factual", color: "text-info" },
  bright: { icon: Sun, label: "Warm & Supportive", color: "text-warning" },
  strict: { icon: Flame, label: "Direct & Focused", color: "text-destructive" },
};

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "안녕하세요! 오늘 식사 기록을 도와드릴게요. 뭘 드셨는지 편하게 말씀해주세요 😊",
    timestamp: new Date(),
  },
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [persona] = useState<CoachPersona>("bright");
  const scrollRef = useRef<HTMLDivElement>(null);

  const PersonaIcon = personaConfig[persona].icon;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "좋아요! 기록해뒀어요. 점심으로 단백질을 충분히 섭취하셨네요! 💪",
        "오늘 칼로리의 45%를 섭취하셨어요. 저녁은 가볍게 드시는 게 좋겠어요.",
        "제육볶음 잘 드셨네요! 야채도 함께 드셨으면 영양 균형이 더 좋았을 거예요.",
      ];
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">AI Coach</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PersonaIcon className={cn("w-3 h-3", personaConfig[persona].color)} />
            <span>{personaConfig[persona].label}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
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
                  "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm",
                  message.role === "user"
                    ? "bg-chat-user text-primary-foreground rounded-br-md"
                    : "bg-chat-assistant text-foreground rounded-bl-md"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-chat-assistant px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
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
            placeholder="오늘 뭐 드셨어요?"
            className="flex-1 rounded-xl bg-background border-border"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl shadow-glow"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          식단을 말로 기록해보세요. AI가 자동으로 분석해드려요.
        </p>
      </div>
    </div>
  );
}

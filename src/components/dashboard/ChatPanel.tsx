import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Snowflake, Sun, Flame, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatMessages, useSendMessage, useClearChat, CoachPersona } from "@/hooks/useChat";
import { useProfile, useUpdatePersona } from "@/hooks/useProfile";
import type { ChatMessage } from "@/types/domain";

const personaConfig: Record<CoachPersona, { icon: typeof Snowflake; label: string; color: string }> = {
  cold: { icon: Snowflake, label: "Cool & Factual", color: "text-info" },
  bright: { icon: Sun, label: "Warm & Supportive", color: "text-warning" },
  strict: { icon: Flame, label: "Direct & Focused", color: "text-destructive" },
};

const welcomeMessages: Record<CoachPersona, string> = {
  cold: "안녕하세요. 오늘 식사 기록을 도와드리겠습니다. 무엇을 드셨나요?",
  bright: "안녕하세요! 오늘 식사 기록을 도와드릴게요. 뭘 드셨는지 편하게 말씀해주세요 😊",
  strict: "안녕하세요. 오늘 식단을 기록하겠습니다. 무엇을 먹었습니까?",
};

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user profile to load saved persona preference
  const { data: profile } = useProfile();
  const updatePersona = useUpdatePersona();

  // Initialize persona from profile, fallback to 'bright'
  const [persona, setPersona] = useState<CoachPersona>("bright");

  // Sync persona state when profile loads
  useEffect(() => {
    if (profile?.coach_persona) {
      setPersona(profile.coach_persona);
    }
  }, [profile?.coach_persona]);

  // React Query hooks
  const { data: messages = [], isLoading: isLoadingMessages } = useChatMessages();
  const sendMessage = useSendMessage();
  const clearChat = useClearChat();

  const PersonaIcon = personaConfig[persona].icon;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, sendMessage.isPending]);

  const handleSend = async () => {
    if (!input.trim() || sendMessage.isPending) return;

    const content = input.trim();
    setInput("");

    try {
      await sendMessage.mutateAsync({ content, persona });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('채팅 기록을 모두 삭제하시겠습니까?')) {
      try {
        await clearChat.mutateAsync();
      } catch (error) {
        console.error('Failed to clear chat:', error);
      }
    }
  };

  const handlePersonaChange = async (newPersona: CoachPersona) => {
    setPersona(newPersona);

    // Save persona preference to profile
    try {
      await updatePersona.mutateAsync(newPersona);
    } catch (error) {
      console.error('Failed to update persona preference:', error);
    }
  };

  // Display messages with welcome message if empty
  const displayMessages: Array<ChatMessage | { id: string; role: 'assistant'; content: string; created_at: string }> =
    messages.length > 0
      ? messages
      : [{ id: 'welcome', role: 'assistant' as const, content: welcomeMessages[persona], created_at: new Date().toISOString() }];

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">AI Coach</h3>
          <div className="flex items-center gap-2">
            {(Object.keys(personaConfig) as CoachPersona[]).map((p) => {
              const config = personaConfig[p];
              const Icon = config.icon;
              return (
                <button
                  key={p}
                  onClick={() => handlePersonaChange(p)}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors",
                    persona === p
                      ? "bg-muted"
                      : "hover:bg-muted/50 opacity-50"
                  )}
                >
                  <Icon className={cn("w-3 h-3", config.color)} />
                  {persona === p && <span className="text-muted-foreground">{config.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleClearChat}
            disabled={clearChat.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : (
            <>
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-chat-user text-primary-foreground rounded-br-md"
                        : "bg-chat-assistant text-foreground rounded-bl-md"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
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
            </>
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
            disabled={sendMessage.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || sendMessage.isPending}
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

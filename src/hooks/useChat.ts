import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type { ChatMessage } from '@/types/domain';
import OpenAI from 'openai';

// OpenAI client (for development - in production, use Edge Function)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development!
});

export type CoachPersona = 'cold' | 'bright' | 'strict';

// System prompts for each persona
const systemPrompts: Record<CoachPersona, string> = {
  cold: `You are a diet coach with a cool, factual personality.
- Be concise and data-driven
- No emojis
- Focus on numbers and facts
- Give practical, straightforward advice
- Respond in Korean`,

  bright: `You are a warm and supportive diet coach.
- Be encouraging and positive
- Use emojis appropriately
- Celebrate small wins
- Provide gentle guidance
- Respond in Korean`,

  strict: `You are a strict and direct diet coach.
- Be firm but fair
- Focus on goals and discipline
- Don't sugarcoat advice
- Push for accountability
- Respond in Korean`,
};

// Query keys
const chatKeys = {
  all: ['chat'] as const,
  messages: () => [...chatKeys.all, 'messages'] as const,
};

// Fetch chat messages from Supabase
export function useChatMessages() {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: chatKeys.messages(),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50); // Last 50 messages

      if (error) throw error;
      return data || [];
    },
  });
}

// Send message and get AI response
export function useSendMessage() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async ({
      content,
      persona,
    }: {
      content: string;
      persona: CoachPersona;
    }): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {
      // 1. Save user message to Supabase
      const { data: userMsg, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'user',
          content,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 2. Immediately update cache to show user message
      queryClient.invalidateQueries({ queryKey: chatKeys.messages() });

      // 3. Get recent messages for context
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // 4. Build messages array for OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompts[persona] },
        ...(recentMessages || []).reverse().map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // 5. Call OpenAI API (gpt-4o-mini)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: persona === 'cold' ? 0.3 : persona === 'strict' ? 0.5 : 0.7,
      });

      const assistantContent =
        completion.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';

      // 6. Save assistant message to Supabase
      const { data: assistantMsg, error: assistantError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      return {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages() });
    },
  });
}

// Clear chat history
export function useClearChat() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages() });
    },
  });
}

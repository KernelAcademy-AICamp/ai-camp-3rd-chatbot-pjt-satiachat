/**
 * Chat hook using Backend API
 * Replaces direct OpenAI calls with secure backend API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { chatApi, type ChatResponse } from '@/lib/api';
import type { ChatMessage } from '@/types/domain';

export type CoachPersona = 'cold' | 'bright' | 'strict';

// Chat type for diet conversations
const CHAT_TYPE = 'diet';

// Query keys
const chatKeys = {
  all: ['chat'] as const,
  messages: () => [...chatKeys.all, 'messages'] as const,
};

// ============================================
// Chat Messages Query
// ============================================

export function useChatMessages(limit: number = 50) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: chatKeys.messages(),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('chat_type', CHAT_TYPE)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).reverse();
    },
  });
}

// ============================================
// Send Message Mutation (Backend API)
// ============================================

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      persona,
    }: {
      content: string;
      persona: CoachPersona;
    }): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage; response: ChatResponse }> => {

      // Optimistically add user message to cache
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: getCurrentUserId(),
        role: 'user',
        content,
        chat_type: CHAT_TYPE,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
        return old ? [...old, tempUserMsg] : [tempUserMsg];
      });

      try {
        // Call backend API
        const response = await chatApi.sendMessage({ content, persona });

        // Invalidate and refetch messages from DB
        await queryClient.invalidateQueries({ queryKey: chatKeys.messages() });

        // Get the latest messages
        const messages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages()) || [];
        const userMessage = messages.find(m => m.content === content && m.role === 'user') || tempUserMsg;
        const assistantMessage = messages[messages.length - 1];

        // Invalidate related queries (meals, calories, etc.)
        if (response.action_result?.tool_calls) {
          queryClient.invalidateQueries({ queryKey: ['meals'] });
          queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
        }

        return {
          userMessage,
          assistantMessage,
          response,
        };
      } catch (error) {
        // Remove optimistic update on error
        queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
          return old?.filter(m => m.id !== tempUserMsg.id) || [];
        });
        throw error;
      }
    },
  });
}

// ============================================
// Clear Chat History Mutation
// ============================================

export function useClearChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await chatApi.clearHistory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages() });
    },
  });
}

// ============================================
// AI Analysis (MyPage)
// Uses backend API for analysis
// ============================================

export function useAIAnalysis() {
  return useMutation({
    mutationFn: async ({ persona = 'bright' as CoachPersona }): Promise<string> => {
      // Call the chat API with an analysis request
      const response = await chatApi.sendMessage({
        content: '지난 7일간의 내 다이어트 현황을 분석해줘. 주간 요약, 잘한 점, 개선할 점, 추천 액션을 알려줘.',
        persona,
      });

      return response.message;
    },
  });
}

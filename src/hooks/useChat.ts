/**
 * 챗봇 훅 - Backend API 사용 버전
 * OpenAI API 키가 더 이상 브라우저에 노출되지 않음
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type { ChatMessage } from '@/types/domain';
import { chatApi } from '@/lib/api';

// Re-export CoachPersona for external use
export type CoachPersona = 'cold' | 'bright' | 'strict';

// Chat type for diet conversations
const CHAT_TYPE = 'diet';

// Query keys
const chatKeys = {
  all: ['chat'] as const,
  messages: () => [...chatKeys.all, 'messages'] as const,
};

// ============================================
// 채팅 메시지 조회
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
// 메시지 전송 (Backend API 호출)
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
    }): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {

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
        console.log('[Chat] Sending message to backend API...');

        // Call backend API (handles intent classification, context, function calling)
        const response = await chatApi.sendMessage({ content, persona });

        console.log('[Chat] Response received, intent:', response.intent);

        // Invalidate and refetch messages from DB
        await queryClient.invalidateQueries({ queryKey: chatKeys.messages() });

        // Invalidate related queries if there were tool calls
        if (response.action_result?.tool_calls) {
          console.log('[Chat] Tool calls detected, invalidating related queries');
          queryClient.invalidateQueries({ queryKey: ['meals'] });
          queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
        }

        // Get the latest messages from cache
        const messages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages()) || [];
        const userMessage = messages.find(m => m.content === content && m.role === 'user') || tempUserMsg as ChatMessage;
        const assistantMessage = messages[messages.length - 1];

        return { userMessage, assistantMessage };
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
// 채팅 기록 삭제
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
// AI 분석 (MyPage용)
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

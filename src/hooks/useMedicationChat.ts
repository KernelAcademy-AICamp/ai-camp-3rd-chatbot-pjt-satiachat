import { useState, useCallback, useEffect } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { medicationApi } from '@/lib/api';

// Chat type for medication conversations
const CHAT_TYPE = 'medication';

export interface MedicationChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEmergency?: boolean;
  sources?: string[];
}

/**
 * 약물 전문 AI 챗봇 훅 (Backend API 사용)
 */
export function useMedicationChat() {
  const [messages, setMessages] = useState<MedicationChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 페이지 로드 시 기존 대화 내역 불러오기
  useEffect(() => {
    const loadMessages = async () => {
      const userId = getCurrentUserId();

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('chat_type', CHAT_TYPE)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        const loadedMessages: MedicationChatMessage[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
      setIsInitialLoading(false);
    };

    loadMessages();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 사용자 메시지 즉시 표시 (optimistic update)
    const tempUserMessage: MedicationChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      // Backend API 호출 (JWT 인증 포함)
      console.log('[MedicationChat] Calling backend API...');
      const response = await medicationApi.ask({
        query: content,
        include_health_context: true,
        use_rag: true,
      });

      console.log('[MedicationChat] Response received, emergency:', response.is_emergency);

      // 응급 상황 경고 로깅
      if (response.is_emergency) {
        console.warn('[MedicationChat] Emergency detected!');
      }

      // Supabase에서 최신 메시지 다시 로드
      const userId = getCurrentUserId();
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('chat_type', CHAT_TYPE)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data) {
        const loadedMessages: MedicationChatMessage[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          isEmergency: msg.role === 'assistant' && response.is_emergency,
          sources: msg.role === 'assistant' ? response.sources : undefined,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Medication chat error:', error);

      // 에러 시 임시 메시지 제거
      setMessages((prev) => prev.filter(m => m.id !== tempUserMessage.id));

      // 에러 메시지 표시
      const errorMessage: MedicationChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 서버 연결을 확인해주세요.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(async () => {
    try {
      await medicationApi.clearHistory();
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    isInitialLoading,
    clearMessages,
  };
}

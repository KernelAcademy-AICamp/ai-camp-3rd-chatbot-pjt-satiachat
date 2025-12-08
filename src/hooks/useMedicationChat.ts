import { useState, useCallback, useEffect } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import OpenAI from 'openai';
import { classifyMedicationIntent, type MedicationIntent } from '@/lib/ai/prompts';

// RAG API endpoint (Python FastAPI backend)
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001';

// OpenAI 클라이언트 (의도 분류용)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Chat type for medication conversations
const CHAT_TYPE = 'medication';

// 컨텍스트 캐시 (5분 TTL)
const CONTEXT_CACHE_TTL = 5 * 60 * 1000;
let cachedContext: { data: string; timestamp: number; userId: string } | null = null;

export interface MedicationChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 사용자 건강 데이터 수집 (캐싱 적용)
 */
async function getUserHealthContext(): Promise<string> {
  const userId = getCurrentUserId();

  // 캐시 유효성 검사
  if (
    cachedContext &&
    cachedContext.userId === userId &&
    Date.now() - cachedContext.timestamp < CONTEXT_CACHE_TTL
  ) {
    return cachedContext.data;
  }

  // 1. 프로필 정보
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // 2. 최근 30일 체중 기록
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: weightLogs } = await supabase
    .from('progress_logs')
    .select('date, weight_kg, body_fat_percent')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgoStr)
    .order('date', { ascending: true });

  // 3. 최근 7일 칼로리 기록
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data: meals } = await supabase
    .from('meals')
    .select('date, total_calories')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgoStr)
    .order('date', { ascending: true });

  // 4. 약물 목록 및 최근 복용 기록
  const { data: medications } = await supabase
    .from('medications')
    .select(`
      id,
      name,
      dosage,
      frequency,
      time_of_day,
      medication_logs (taken_at, status)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  // 컨텍스트 문자열 생성 (토큰 최적화)
  let context = '## 건강 데이터\n';

  // 프로필 (간결하게)
  if (profile) {
    context += `체중: ${profile.current_weight_kg || '?'}kg → 목표: ${profile.goal_weight_kg || '?'}kg | 칼로리목표: ${profile.target_calories || 2000}kcal\n`;
  }

  // 체중 변화 (30일) - 핵심만
  if (weightLogs && weightLogs.length > 0) {
    const firstWeight = weightLogs[0].weight_kg;
    const lastWeight = weightLogs[weightLogs.length - 1].weight_kg;
    const monthlyChange = lastWeight - firstWeight;
    context += `\n체중변화(30일): ${firstWeight}→${lastWeight}kg (${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(1)}kg)\n`;
  }

  // 칼로리 (7일) - 평균만
  if (meals && meals.length > 0) {
    const dailyCalories: Record<string, number> = {};
    meals.forEach((meal) => {
      if (!dailyCalories[meal.date]) dailyCalories[meal.date] = 0;
      dailyCalories[meal.date] += meal.total_calories || 0;
    });
    const calories = Object.values(dailyCalories);
    const avgCalories = Math.round(calories.reduce((a, b) => a + b, 0) / calories.length);
    const targetCalories = profile?.target_calories || 2000;
    context += `칼로리(7일평균): ${avgCalories}kcal (목표의 ${Math.round((avgCalories / targetCalories) * 100)}%)\n`;
  }

  // 약물 - 이름과 복용률만
  if (medications && medications.length > 0) {
    context += '\n약물: ';
    const medSummary = medications.map((med) => {
      const logs = (med.medication_logs as any[]) || [];
      const recentLogs = logs.slice(-7);
      const takenCount = recentLogs.filter((l) => l.status === 'taken').length;
      const rate = recentLogs.length > 0 ? Math.round((takenCount / recentLogs.length) * 100) : 0;
      return `${med.name}(${rate}%)`;
    });
    context += medSummary.join(', ');
  }

  // 캐시 저장
  cachedContext = { data: context, timestamp: Date.now(), userId };

  return context;
}

/**
 * 약물 전문 AI 챗봇 훅 (Supabase 저장 지원)
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

    const userId = getCurrentUserId();

    // 1. 사용자 메시지를 Supabase에 저장
    const { data: userMsgData, error: userError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'user',
        content,
        chat_type: CHAT_TYPE,
      })
      .select()
      .single();

    if (userError) {
      console.error('Failed to save user message:', userError);
      return;
    }

    const userMessage: MedicationChatMessage = {
      id: userMsgData.id,
      role: 'user',
      content,
      timestamp: new Date(userMsgData.created_at),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // [1단계] 의도 분류 (gpt-4o-mini, ~50 토큰)
      console.log('[MedicationChat] Step 1: Classifying intent...');
      const intent = await classifyMedicationIntent(openai, content);
      console.log('[MedicationChat] Intent:', intent);

      // [2단계] 컨텍스트 수집 (chat 제외)
      let healthContext = '';
      if (intent !== 'chat') {
        console.log('[MedicationChat] Step 2: Collecting health context...');
        healthContext = await getUserHealthContext();
      }

      // RAG 사용 여부 결정
      // - medication_info: RAG 필수 (약물 정보 검색)
      // - analysis: RAG 필수 (약물+통계 종합 분석)
      // - stats: RAG 불필요 (통계만 사용)
      // - chat: RAG 불필요 (일반 대화)
      const useRag = intent === 'medication_info' || intent === 'analysis';
      console.log('[MedicationChat] Use RAG:', useRag);

      // [3단계] Python RAG API 호출
      console.log('[MedicationChat] Step 3: Calling RAG API...');
      const response = await fetch(`${RAG_API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          user_context: healthContext,
          use_rag: useRag,
          intent: intent,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG API error: ${response.status}`);
      }

      const data = await response.json();
      const responseContent = data.response || '응답을 생성할 수 없습니다.';

      // 응급 상황 경고 로깅
      if (data.is_emergency) {
        console.warn('[MedicationChat] Emergency detected!');
      }

      // AI 응답을 Supabase에 저장
      const { data: assistantMsgData, error: assistantError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'assistant',
          content: responseContent,
          chat_type: CHAT_TYPE,
        })
        .select()
        .single();

      if (assistantError) {
        console.error('Failed to save assistant message:', assistantError);
      }

      const assistantMessage: MedicationChatMessage = {
        id: assistantMsgData?.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(assistantMsgData?.created_at || Date.now()),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Medication chat error:', error);

      // 에러 메시지 (저장하지 않음)
      const errorMessage: MedicationChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(async () => {
    const userId = getCurrentUserId();

    // Supabase에서 해당 사용자의 medication 채팅 삭제
    await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
      .eq('chat_type', CHAT_TYPE);

    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    isInitialLoading,
    clearMessages,
  };
}

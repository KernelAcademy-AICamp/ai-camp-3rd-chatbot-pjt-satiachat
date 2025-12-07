import { useState, useCallback, useEffect } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';

// RAG API endpoint (Python FastAPI backend)
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000';

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

  // 컨텍스트 문자열 생성
  let context = '## 현재 사용자 건강 데이터\n\n';

  // 프로필
  if (profile) {
    context += '### 기본 정보\n';
    context += `- 현재 체중: ${profile.current_weight_kg || '미등록'}kg\n`;
    context += `- 목표 체중: ${profile.goal_weight_kg || '미등록'}kg\n`;
    context += `- 일일 목표 칼로리: ${profile.target_calories || 2000}kcal\n`;
    context += `- 활동 수준: ${profile.activity_level || '보통'}\n\n`;
  }

  // 체중 변화 (30일)
  context += '### 최근 30일 체중 변화\n';
  if (weightLogs && weightLogs.length > 0) {
    const firstWeight = weightLogs[0].weight_kg;
    const lastWeight = weightLogs[weightLogs.length - 1].weight_kg;
    const monthlyChange = lastWeight - firstWeight;

    // 주요 기록만 표시 (처음, 중간, 마지막)
    if (weightLogs.length >= 3) {
      const midIndex = Math.floor(weightLogs.length / 2);
      context += `- ${weightLogs[0].date}: ${weightLogs[0].weight_kg}kg (시작)\n`;
      context += `- ${weightLogs[midIndex].date}: ${weightLogs[midIndex].weight_kg}kg (중간)\n`;
      context += `- ${weightLogs[weightLogs.length - 1].date}: ${lastWeight}kg (현재)\n`;
    } else {
      weightLogs.forEach((log) => {
        context += `- ${log.date}: ${log.weight_kg}kg\n`;
      });
    }
    context += `- **월간 변화: ${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(1)}kg**\n\n`;
  } else {
    context += '- 기록 없음\n\n';
  }

  // 칼로리 (7일)
  context += '### 최근 7일 칼로리 섭취\n';
  if (meals && meals.length > 0) {
    const dailyCalories: Record<string, number> = {};
    meals.forEach((meal) => {
      if (!dailyCalories[meal.date]) dailyCalories[meal.date] = 0;
      dailyCalories[meal.date] += meal.total_calories || 0;
    });

    const calories = Object.values(dailyCalories);
    const avgCalories = Math.round(calories.reduce((a, b) => a + b, 0) / calories.length);
    const targetCalories = profile?.target_calories || 2000;

    Object.entries(dailyCalories).slice(-5).forEach(([date, cal]) => {
      context += `- ${date}: ${cal}kcal\n`;
    });
    context += `- **일 평균: ${avgCalories}kcal (목표 대비 ${Math.round((avgCalories / targetCalories) * 100)}%)**\n\n`;
  } else {
    context += '- 기록 없음\n\n';
  }

  // 약물 복용
  context += '### 복용 중인 약물\n';
  if (medications && medications.length > 0) {
    medications.forEach((med) => {
      const logs = (med.medication_logs as any[]) || [];
      const recentLogs = logs.slice(-7);
      const takenCount = recentLogs.filter((l) => l.status === 'taken').length;

      context += `- **${med.name}** ${med.dosage || ''}\n`;
      context += `  - 복용 주기: ${med.frequency === 'daily' ? '매일' : med.frequency === 'weekly' ? '주 1회' : '필요시'}\n`;
      context += `  - 복용 시간: ${med.time_of_day || '미정'}\n`;
      context += `  - 최근 7일 복용률: ${recentLogs.length > 0 ? Math.round((takenCount / recentLogs.length) * 100) : 0}%\n`;
    });
  } else {
    context += '- 등록된 약물 없음\n';
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

  const sendMessage = useCallback(async (content: string, useRag: boolean = true) => {
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
      // 건강 데이터 컨텍스트 수집
      const healthContext = await getUserHealthContext();

      // RAG API 호출
      const response = await fetch(`${RAG_API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          user_context: healthContext,
          use_rag: useRag,  // false면 RAG 스킵 (토큰 절약)
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG API error: ${response.status}`);
      }

      const data = await response.json();
      const responseContent = data.response || '응답을 생성할 수 없습니다.';

      // 2. AI 응답을 Supabase에 저장
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

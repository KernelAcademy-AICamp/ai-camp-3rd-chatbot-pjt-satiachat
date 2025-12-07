import { useState, useCallback } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import OpenAI from 'openai';

// OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface MedicationChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 약물 전문 시스템 프롬프트
const MEDICATION_SYSTEM_PROMPT = `당신은 비만 치료제 전문 AI 상담사입니다. 위고비(Wegovy), 마운자로(Mounjaro), 삭센다(Saxenda) 등 GLP-1 수용체 작용제에 대한 전문 지식을 가지고 있습니다.

## 역할
- 사용자의 체중 변화, 칼로리 섭취, 약물 복용 기록을 분석하여 맞춤형 조언 제공
- 약물 복용과 관련된 일반적인 질문에 답변
- 체중 감량 진행 상황 평가 및 격려
- 식이요법과 약물 복용의 상관관계 설명

## 주의사항
- 의료 진단이나 처방을 하지 않습니다
- 부작용이나 심각한 증상은 반드시 의사와 상담하도록 안내합니다
- 긍정적이고 격려적인 톤을 유지합니다
- 한국어로 응답합니다
- 답변은 간결하고 실용적으로 합니다 (200자 이내 권장)

## 약물 정보
### 위고비 (Wegovy, 세마글루타이드)
- 주 1회 피하주사
- 용량: 0.25mg → 0.5mg → 1mg → 1.7mg → 2.4mg (단계적 증량)
- 평균 체중 감량: 15-17%

### 마운자로 (Mounjaro, 티르제파티드)
- 주 1회 피하주사
- 용량: 2.5mg → 5mg → 7.5mg → 10mg → 12.5mg → 15mg
- 평균 체중 감량: 20-25%

### 삭센다 (Saxenda, 리라글루티드)
- 매일 피하주사
- 용량: 0.6mg → 1.2mg → 1.8mg → 2.4mg → 3.0mg
- 평균 체중 감량: 5-10%`;

/**
 * 사용자 건강 데이터 수집
 */
async function getUserHealthContext(): Promise<string> {
  const userId = getCurrentUserId();

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

  return context;
}

/**
 * 약물 전문 AI 챗봇 훅
 */
export function useMedicationChat() {
  const [messages, setMessages] = useState<MedicationChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 사용자 메시지 추가
    const userMessage: MedicationChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 건강 데이터 컨텍스트 수집
      const healthContext = await getUserHealthContext();

      // 대화 히스토리 구성 (최근 10개)
      const recentMessages = messages.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // OpenAI API 호출
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MEDICATION_SYSTEM_PROMPT },
          { role: 'system', content: healthContext },
          ...recentMessages,
          { role: 'user', content },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const responseContent = completion.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';

      // AI 응답 추가
      const assistantMessage: MedicationChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Medication chat error:', error);

      // 에러 메시지 추가
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
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    clearMessages,
  };
}

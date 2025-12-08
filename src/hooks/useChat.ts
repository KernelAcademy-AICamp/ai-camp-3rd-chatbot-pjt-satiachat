/**
 * 챗봇 훅 - 2단계 AI 호출 구조
 * 1단계: 의도 분류 (~100 토큰)
 * 2단계: 목적별 맞춤 프롬프트 (최소 토큰)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type { ChatMessage, MealType } from '@/types/domain';
import OpenAI from 'openai';

// 프롬프트 시스템
import {
  classifyIntent,
  type ChatIntent,
  type CoachPersona,
  buildLogPrompt,
  buildQueryPrompt,
  buildModifyPrompt,
  buildAnalyzePrompt,
  buildChatPrompt,
} from '@/lib/ai/prompts';

// 도구 정의
import {
  logMealTool,
  getMealsTool,
  deleteMealTool,
  updateMealTool,
  parseLogMealArgs,
  parseGetMealsArgs,
  parseDeleteMealArgs,
  parseUpdateMealArgs,
} from '@/lib/ai/food-tools';

// Re-export CoachPersona for external use
export type { CoachPersona } from '@/lib/ai/prompts';

// OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Chat type for diet conversations
const CHAT_TYPE = 'diet';

// Query keys
const chatKeys = {
  all: ['chat'] as const,
  messages: () => [...chatKeys.all, 'messages'] as const,
};

// ============================================
// 유틸리티 함수
// ============================================

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inferMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

// ============================================
// 사용자 컨텍스트 조회
// ============================================

interface UserContext {
  todayCalories: number;
  targetCalories: number;
  consecutiveDays: number;
  currentWeight: number | null;
  goalWeight: number | null;
  todayFoods: string[];
}

async function fetchUserContext(userId: string): Promise<UserContext> {
  const today = getToday();

  // 1. 오늘 식단 조회
  const { data: todayMeals } = await supabase
    .from('meals')
    .select(`total_calories, meal_type, meal_items (name)`)
    .eq('user_id', userId)
    .eq('date', today);

  const todayCalories = (todayMeals || []).reduce(
    (sum, meal) => sum + (meal.total_calories || 0),
    0
  );

  // 오늘 먹은 음식 목록
  const todayFoods: string[] = [];
  const mealTypeKr: Record<string, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식',
  };
  (todayMeals || []).forEach((meal: any) => {
    (meal.meal_items || []).forEach((item: any) => {
      todayFoods.push(`${mealTypeKr[meal.meal_type] || ''}:${item.name}`);
    });
  });

  // 2. 프로필 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('target_calories, current_weight_kg, goal_weight_kg')
    .eq('user_id', userId)
    .single();

  const targetCalories = profile?.target_calories || 2000;
  const currentWeight = profile?.current_weight_kg || null;
  const goalWeight = profile?.goal_weight_kg || null;

  // 3. 연속 기록 일수 (간단히 - 최근 7일만 체크)
  let consecutiveDays = 0;
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);

  for (let i = 0; i < 7; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const { data: meals } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .limit(1);

    if (meals && meals.length > 0) {
      consecutiveDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { todayCalories, targetCalories, consecutiveDays, currentWeight, goalWeight, todayFoods };
}

// ============================================
// DB 조작 함수
// ============================================

async function logMealDirectly(
  mealType: MealType,
  date: string,
  foods: Array<{
    name: string;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>
): Promise<{ success: boolean; message: string }> {
  const userId = getCurrentUserId();
  const processedFoods = foods.map((f) => ({
    name: f.name,
    quantity: f.quantity,
    calories: Math.round(f.calories * f.quantity),
    protein: Math.round(f.protein * f.quantity * 10) / 10,
    carbs: Math.round(f.carbs * f.quantity * 10) / 10,
    fat: Math.round(f.fat * f.quantity * 10) / 10,
  }));

  const newItemsCalories = processedFoods.reduce((sum, f) => sum + f.calories, 0);

  // 기존 meal 조회
  const { data: existingMeal } = await supabase
    .from('meals')
    .select('id, total_calories')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  let mealId: string;
  let totalCalories: number;

  if (existingMeal) {
    mealId = existingMeal.id;
    totalCalories = (existingMeal.total_calories || 0) + newItemsCalories;

    const mealItems = processedFoods.map((f) => ({
      meal_id: mealId,
      name: f.name,
      calories: f.calories,
      protein_g: f.protein,
      carbs_g: f.carbs,
      fat_g: f.fat,
      quantity: `${f.quantity}인분`,
    }));

    await supabase.from('meal_items').insert(mealItems);
    await supabase.from('meals').update({ total_calories: totalCalories }).eq('id', mealId);
  } else {
    totalCalories = newItemsCalories;

    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({ user_id: userId, date, meal_type: mealType, total_calories: totalCalories })
      .select('id')
      .single();

    if (mealError) return { success: false, message: '식사 기록 실패' };
    mealId = mealData.id;

    const mealItems = processedFoods.map((f) => ({
      meal_id: mealId,
      name: f.name,
      calories: f.calories,
      protein_g: f.protein,
      carbs_g: f.carbs,
      fat_g: f.fat,
      quantity: `${f.quantity}인분`,
    }));

    await supabase.from('meal_items').insert(mealItems);
  }

  const foodNames = processedFoods.map((f) => f.name).join(', ');
  return { success: true, message: `${foodNames} (${totalCalories}kcal) 기록 완료` };
}

async function getMealsData(date: string, mealType: string) {
  const userId = getCurrentUserId();

  let query = supabase
    .from('meals')
    .select(`*, meal_items (*)`)
    .eq('user_id', userId)
    .eq('date', date);

  if (mealType !== 'all') {
    query = query.eq('meal_type', mealType);
  }

  const { data: meals } = await query.order('created_at', { ascending: true });

  if (!meals || meals.length === 0) {
    return { success: true, message: `${date} 식단 기록이 없습니다.`, data: null };
  }

  const mealTypeLabels: Record<string, string> = {
    breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
  };

  const summary = meals.map((m) => {
    const items = (m.meal_items || []).map((i: any) => i.name).join(', ');
    return `${mealTypeLabels[m.meal_type]}: ${items} (${m.total_calories}kcal)`;
  }).join('\n');

  const totalCalories = meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);

  return {
    success: true,
    message: `${date} 식단:\n${summary}\n총 ${totalCalories}kcal`,
    data: meals,
  };
}

async function deleteMealData(date: string, mealType: MealType, foodName?: string) {
  const userId = getCurrentUserId();
  const mealTypeLabels: Record<MealType, string> = {
    breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
  };

  const { data: meal } = await supabase
    .from('meals')
    .select(`id, total_calories, meal_items (id, name, calories)`)
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (!meal) {
    return { success: false, message: `${date} ${mealTypeLabels[mealType]} 기록이 없습니다.` };
  }

  if (foodName) {
    const items = meal.meal_items as Array<{ id: string; name: string; calories: number }>;
    const targetItem = items.find((item) => item.name.toLowerCase().includes(foodName.toLowerCase()));

    if (!targetItem) {
      return { success: false, message: `"${foodName}"을(를) 찾을 수 없습니다.` };
    }

    await supabase.from('meal_items').delete().eq('id', targetItem.id);
    const newTotal = Math.max(0, (meal.total_calories || 0) - targetItem.calories);
    await supabase.from('meals').update({ total_calories: newTotal }).eq('id', meal.id);

    if (items.length === 1) {
      await supabase.from('meals').delete().eq('id', meal.id);
    }

    return { success: true, message: `"${targetItem.name}" 삭제 완료` };
  }

  await supabase.from('meals').delete().eq('id', meal.id);
  return { success: true, message: `${mealTypeLabels[mealType]} 전체 삭제 완료` };
}

async function updateMealData(
  date: string,
  mealType: MealType,
  oldFoodName: string,
  newFood: { name: string; calories: number; protein: number; carbs: number; fat: number }
) {
  const userId = getCurrentUserId();
  const mealTypeLabels: Record<MealType, string> = {
    breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
  };

  const { data: meal } = await supabase
    .from('meals')
    .select(`id, total_calories, meal_items (id, name, calories)`)
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (!meal) {
    return { success: false, message: `${date} ${mealTypeLabels[mealType]} 기록이 없습니다.` };
  }

  const items = meal.meal_items as Array<{ id: string; name: string; calories: number }>;
  const targetItem = items.find((item) => item.name.toLowerCase().includes(oldFoodName.toLowerCase()));

  if (!targetItem) {
    return { success: false, message: `"${oldFoodName}"을(를) 찾을 수 없습니다.` };
  }

  await supabase
    .from('meal_items')
    .update({
      name: newFood.name,
      calories: newFood.calories,
      protein_g: newFood.protein,
      carbs_g: newFood.carbs,
      fat_g: newFood.fat,
    })
    .eq('id', targetItem.id);

  const caloriesDiff = newFood.calories - targetItem.calories;
  const newTotal = Math.max(0, (meal.total_calories || 0) + caloriesDiff);
  await supabase.from('meals').update({ total_calories: newTotal }).eq('id', meal.id);

  return { success: true, message: `"${targetItem.name}" → "${newFood.name}" 수정 완료` };
}

// ============================================
// 의도별 도구 및 프롬프트 매핑
// ============================================

function getToolsForIntent(intent: ChatIntent): OpenAI.Chat.ChatCompletionTool[] {
  switch (intent) {
    case 'log': return [logMealTool];
    case 'query': return [getMealsTool];
    case 'modify': return [deleteMealTool, updateMealTool];
    case 'analyze': return [];
    case 'chat': return [];
    default: return [];
  }
}

function buildPromptForIntent(
  intent: ChatIntent,
  persona: CoachPersona,
  context: UserContext
): string {
  const today = getToday();

  switch (intent) {
    case 'log':
      return buildLogPrompt(persona, {
        today,
        todayCalories: context.todayCalories,
        targetCalories: context.targetCalories,
      });
    case 'query':
      return buildQueryPrompt(persona, {
        today,
        currentWeight: context.currentWeight,
        goalWeight: context.goalWeight,
      });
    case 'modify':
      return buildModifyPrompt(persona, { today });
    case 'analyze':
      return buildAnalyzePrompt(persona, {
        targetCalories: context.targetCalories,
        todayCalories: context.todayCalories,
        currentWeight: context.currentWeight,
        goalWeight: context.goalWeight,
        todayFoods: context.todayFoods,
        consecutiveDays: context.consecutiveDays,
      });
    case 'chat':
      return buildChatPrompt(persona);
    default:
      return buildChatPrompt(persona);
  }
}

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
// 메시지 전송 (2단계 호출)
// ============================================

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

      // 1. 사용자 메시지 저장
      const { data: userMsg, error: userError } = await supabase
        .from('chat_messages')
        .insert({ user_id: userId, role: 'user', content, chat_type: CHAT_TYPE })
        .select()
        .single();

      if (userError) throw userError;

      // 캐시 업데이트 (사용자 메시지 즉시 표시)
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
        return old ? [...old, userMsg] : [userMsg];
      });

      // 2. 1단계: 의도 분류
      console.log('[Chat] Step 1: Classifying intent...');
      const intent = await classifyIntent(openai, content);
      console.log('[Chat] Intent:', intent);

      // 3. 사용자 컨텍스트 조회 (chat 제외)
      let userContext: UserContext = {
        todayCalories: 0,
        targetCalories: 2000,
        consecutiveDays: 0,
        currentWeight: null,
        goalWeight: null,
        todayFoods: [],
      };

      if (intent !== 'chat') {
        console.log('[Chat] Fetching user context...');
        userContext = await fetchUserContext(userId);
      }

      // 4. 2단계: 목적별 프롬프트 빌드
      const systemPrompt = buildPromptForIntent(intent, persona, userContext);
      const tools = getToolsForIntent(intent);

      console.log('[Chat] Step 2: Calling OpenAI with intent-specific prompt');
      console.log('[Chat] Prompt length:', systemPrompt.length, 'Tools:', tools.length);

      // 5. OpenAI 호출
      const completionParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        max_tokens: intent === 'chat' ? 150 : 500,
        temperature: persona === 'cold' ? 0.3 : persona === 'strict' ? 0.5 : 0.7,
      };

      if (tools.length > 0) {
        completionParams.tools = tools;
        completionParams.tool_choice = 'auto';
      }

      const completion = await openai.chat.completions.create(completionParams);
      const responseMessage = completion.choices[0]?.message;
      let assistantContent = responseMessage?.content || '';

      // 6. Function Calling 처리
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const funcName = toolCall.function.name;
        const funcArgs = toolCall.function.arguments;

        console.log('[Chat] Function call:', funcName);

        if (funcName === 'log_meal') {
          const args = parseLogMealArgs(funcArgs);
          if (args) {
            const result = await logMealDirectly(
              args.meal_type || inferMealType(),
              args.date || getToday(),
              args.foods.map((f) => ({
                name: f.name,
                quantity: f.quantity || 1,
                calories: f.calories,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
              }))
            );
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            queryClient.invalidateQueries({ queryKey: ['todayCalories'] });

            // AI 응답이 있으면 사용, 없으면 결과 메시지 사용
            assistantContent = assistantContent || result.message;
          }
        }

        if (funcName === 'get_meals') {
          const args = parseGetMealsArgs(funcArgs);
          const result = await getMealsData(args.date || getToday(), args.meal_type || 'all');
          assistantContent = assistantContent || result.message;
        }

        if (funcName === 'delete_meal') {
          const args = parseDeleteMealArgs(funcArgs);
          if (args) {
            const result = await deleteMealData(args.date, args.meal_type, args.food_name);
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
            assistantContent = assistantContent || result.message;
          }
        }

        if (funcName === 'update_meal') {
          const args = parseUpdateMealArgs(funcArgs);
          if (args) {
            const result = await updateMealData(args.date, args.meal_type, args.old_food_name, args.new_food);
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
            assistantContent = assistantContent || result.message;
          }
        }
      }

      // 7. Fallback
      if (!assistantContent) {
        assistantContent = '응답을 생성할 수 없습니다.';
      }

      // 8. 어시스턴트 메시지 저장
      const { data: assistantMsg, error: assistantError } = await supabase
        .from('chat_messages')
        .insert({ user_id: userId, role: 'assistant', content: assistantContent, chat_type: CHAT_TYPE })
        .select()
        .single();

      if (assistantError) throw assistantError;

      // 캐시 업데이트
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
        return old ? [...old, assistantMsg] : [assistantMsg];
      });

      return { userMessage: userMsg, assistantMessage: assistantMsg };
    },
  });
}

// ============================================
// 채팅 기록 삭제
// ============================================

export function useClearChat() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)
        .eq('chat_type', CHAT_TYPE);

      if (error) throw error;
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
      const userId = getCurrentUserId();

      // 프로필
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // 최근 7일 체중
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;

      const { data: weightLogs } = await supabase
        .from('progress_logs')
        .select('date, weight_kg')
        .eq('user_id', userId)
        .gte('date', weekAgoStr)
        .order('date', { ascending: true });

      // 최근 7일 식단
      const { data: meals } = await supabase
        .from('meals')
        .select(`date, meal_type, total_calories`)
        .eq('user_id', userId)
        .gte('date', weekAgoStr)
        .order('date', { ascending: true });

      // 컨텍스트 생성
      let contextStr = '## 사용자 정보\n';
      if (profile) {
        contextStr += `- 현재 체중: ${profile.current_weight_kg}kg, 목표: ${profile.goal_weight_kg}kg\n`;
        contextStr += `- 일일 목표: ${profile.target_calories}kcal\n`;
      }

      contextStr += '\n## 최근 7일 체중\n';
      if (weightLogs && weightLogs.length > 0) {
        weightLogs.forEach((log) => {
          contextStr += `- ${log.date}: ${log.weight_kg}kg\n`;
        });
      } else {
        contextStr += '- 기록 없음\n';
      }

      contextStr += '\n## 최근 7일 칼로리\n';
      if (meals && meals.length > 0) {
        const dailyCalories: Record<string, number> = {};
        meals.forEach((meal) => {
          if (!dailyCalories[meal.date]) dailyCalories[meal.date] = 0;
          dailyCalories[meal.date] += meal.total_calories || 0;
        });
        Object.entries(dailyCalories).forEach(([date, cal]) => {
          contextStr += `- ${date}: ${cal}kcal\n`;
        });
      } else {
        contextStr += '- 기록 없음\n';
      }

      const analysisPrompt = `아래 데이터를 분석하여 간결한 피드백을 제공해주세요.

${contextStr}

형식:
1. 주간 요약 (1-2문장)
2. 잘한 점 (1개)
3. 개선할 점 (1개)
4. 이번 주 추천 액션 (1개)`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildAnalyzePrompt(persona, {
            targetCalories: profile?.target_calories || 2000,
            todayCalories: 0,
            currentWeight: profile?.current_weight_kg || null,
            goalWeight: profile?.goal_weight_kg || null,
            todayFoods: [],
            consecutiveDays: 0,
          }) },
          { role: 'user', content: analysisPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'AI 응답을 받지 못했습니다.';
    },
  });
}

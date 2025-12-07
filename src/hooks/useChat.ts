import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type { ChatMessage, MealType } from '@/types/domain';
import OpenAI from 'openai';
import { foodLoggingTools, parseLogMealArgs, parseGetMealsArgs, parseDeleteMealArgs, parseUpdateMealArgs } from '@/lib/ai/food-tools';

// OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type CoachPersona = 'cold' | 'bright' | 'strict';

// 공통 기본 지침 (토큰 효율화)
const BASE_INSTRUCTIONS = `당신은 식단 관리 AI 코치입니다.

## 핵심 규칙
- 한국어로 2-3문장 이내 간결히 응답
- 음식 언급 시 log_meal 함수로 기록 (영양정보 추정)
- 칼로리 추정: 밥 1공기=300kcal, 고기류 100g=150-250kcal, 면류 1인분=450-550kcal

## 칼로리 추정 가이드
- 한식 1인분: 400-600kcal (찌개/탕류 +100kcal)
- 치킨 1인분(1/4마리): 400-500kcal
- 피자 1조각: 250-300kcal
- 커피(아메리카노): 5kcal, 라떼: 150kcal
- 과일 1개(사과/바나나): 80-100kcal`;

// System prompts for each persona
const systemPrompts: Record<CoachPersona, string> = {
  cold: `${BASE_INSTRUCTIONS}

## 페르소나: 차가운 코치
- 팩트 위주, 감정 표현 최소화
- 이모지 사용 금지
- "~입니다" 체로 응답`,

  bright: `${BASE_INSTRUCTIONS}

## 페르소나: 따뜻한 코치
- 긍정적, 격려하는 톤
- 이모지 적절히 사용 😊🍎💪
- 칭찬과 응원 포함`,

  strict: `${BASE_INSTRUCTIONS}

## 페르소나: 엄격한 코치
- 단호하고 직접적
- 목표 달성에 집중
- 개선점 명확히 지적`,
};

// Query keys
const chatKeys = {
  all: ['chat'] as const,
  messages: () => [...chatKeys.all, 'messages'] as const,
};

/**
 * 오늘 날짜 반환 (YYYY-MM-DD) - 로컬 타임존 기준
 */
function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 현재 시간 기준으로 식사 타입 추론
 */
function inferMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

/**
 * AI가 추정한 영양정보로 직접 식사 기록
 * - 같은 날짜/meal_type에 기존 기록이 있으면 items만 추가
 * - 없으면 새로운 meal 생성
 */
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
): Promise<{ success: boolean; message: string; mealId?: string }> {
  const userId = getCurrentUserId();

  // 수량 적용하여 영양정보 계산
  const processedFoods = foods.map((f) => ({
    name: f.name,
    quantity: f.quantity,
    calories: Math.round(f.calories * f.quantity),
    protein: Math.round(f.protein * f.quantity * 10) / 10,
    carbs: Math.round(f.carbs * f.quantity * 10) / 10,
    fat: Math.round(f.fat * f.quantity * 10) / 10,
  }));

  const newItemsCalories = processedFoods.reduce((sum, f) => sum + f.calories, 0);

  // 1. 기존 meal 조회 (같은 날짜, 같은 meal_type)
  const { data: existingMeal, error: fetchError } = await supabase
    .from('meals')
    .select('id, total_calories')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (fetchError) {
    console.error('Existing meal fetch error:', fetchError);
    return { success: false, message: '식사 기록 조회 중 오류가 발생했습니다.' };
  }

  let mealId: string;
  let totalCalories: number;
  let isNewMeal = false;

  if (existingMeal) {
    // [Case A] 기존 meal 존재 → items만 추가
    mealId = existingMeal.id;
    totalCalories = (existingMeal.total_calories || 0) + newItemsCalories;

    // meal_items 추가
    const mealItems = processedFoods.map((f) => ({
      meal_id: mealId,
      name: f.name,
      calories: f.calories,
      protein_g: f.protein,
      carbs_g: f.carbs,
      fat_g: f.fat,
      quantity: `${f.quantity}인분`,
    }));

    const { error: itemsError } = await supabase
      .from('meal_items')
      .insert(mealItems);

    if (itemsError) {
      console.error('Meal items insert error:', itemsError);
      return { success: false, message: '음식 추가 중 오류가 발생했습니다.' };
    }

    // total_calories 업데이트
    const { error: updateError } = await supabase
      .from('meals')
      .update({ total_calories: totalCalories })
      .eq('id', mealId);

    if (updateError) {
      console.error('Meal update error:', updateError);
      // items는 이미 추가됨, 경고만 표시
    }
  } else {
    // [Case B] 기존 meal 없음 → 새로 생성
    isNewMeal = true;
    totalCalories = newItemsCalories;

    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        date,
        meal_type: mealType,
        total_calories: totalCalories,
      })
      .select('id')
      .single();

    if (mealError) {
      console.error('Meal insert error:', mealError);
      return { success: false, message: '식사 기록 중 오류가 발생했습니다.' };
    }

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

    const { error: itemsError } = await supabase.from('meal_items').insert(mealItems);

    if (itemsError) {
      console.error('Meal items insert error:', itemsError);
      // 롤백: meal 삭제
      await supabase.from('meals').delete().eq('id', mealId);
      return { success: false, message: '음식 기록 중 오류가 발생했습니다.' };
    }
  }

  // 성공 메시지 생성
  const mealTypeLabels: Record<MealType, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식',
  };

  const foodNames = processedFoods.map((f) => f.name).join(', ');
  const actionWord = isNewMeal ? '기록' : '추가';
  const message = `${mealTypeLabels[mealType]} ${actionWord} 완료! ${foodNames} - 총 ${totalCalories}kcal`;

  return { success: true, message, mealId };
}

/**
 * 식단 조회 함수
 */
async function getMealsData(
  date: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all'
): Promise<{
  success: boolean;
  message: string;
  data?: {
    date: string;
    meals: Array<{
      meal_type: string;
      total_calories: number;
      items: Array<{
        name: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      }>;
    }>;
    summary: {
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
    };
  };
}> {
  const userId = getCurrentUserId();

  let query = supabase
    .from('meals')
    .select(`
      *,
      meal_items (*)
    `)
    .eq('user_id', userId)
    .eq('date', date);

  if (mealType !== 'all') {
    query = query.eq('meal_type', mealType);
  }

  const { data: meals, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('Get meals error:', error);
    return { success: false, message: '식단 조회 중 오류가 발생했습니다.' };
  }

  if (!meals || meals.length === 0) {
    const mealTypeLabels: Record<string, string> = {
      breakfast: '아침',
      lunch: '점심',
      dinner: '저녁',
      snack: '간식',
      all: '전체',
    };
    return {
      success: true,
      message: `${date} ${mealTypeLabels[mealType]} 식단 기록이 없습니다.`,
      data: {
        date,
        meals: [],
        summary: { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 },
      },
    };
  }

  // 데이터 가공
  const formattedMeals = meals.map((meal) => ({
    meal_type: meal.meal_type,
    total_calories: meal.total_calories || 0,
    items: (meal.meal_items || []).map((item: any) => ({
      name: item.name,
      calories: item.calories || 0,
      protein_g: item.protein_g || 0,
      carbs_g: item.carbs_g || 0,
      fat_g: item.fat_g || 0,
    })),
  }));

  // 총합 계산
  const summary = {
    total_calories: formattedMeals.reduce((sum, m) => sum + m.total_calories, 0),
    total_protein: formattedMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.protein_g, 0),
      0
    ),
    total_carbs: formattedMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.carbs_g, 0),
      0
    ),
    total_fat: formattedMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.fat_g, 0),
      0
    ),
  };

  const mealTypeLabels: Record<string, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식',
  };

  const mealSummaries = formattedMeals
    .map((m) => `${mealTypeLabels[m.meal_type]}: ${m.items.map((i) => i.name).join(', ')} (${m.total_calories}kcal)`)
    .join('\n');

  return {
    success: true,
    message: `${date} 식단 조회 완료\n${mealSummaries}\n총 ${summary.total_calories}kcal`,
    data: {
      date,
      meals: formattedMeals,
      summary,
    },
  };
}

/**
 * 식단 삭제 함수
 */
async function deleteMealData(
  date: string,
  mealType: MealType,
  foodName?: string
): Promise<{ success: boolean; message: string }> {
  const userId = getCurrentUserId();

  const mealTypeLabels: Record<MealType, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식',
  };

  // 1. 해당 meal 조회
  const { data: meal, error: fetchError } = await supabase
    .from('meals')
    .select(`
      id,
      total_calories,
      meal_items (id, name, calories)
    `)
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (fetchError) {
    console.error('Delete meal fetch error:', fetchError);
    return { success: false, message: '식단 조회 중 오류가 발생했습니다.' };
  }

  if (!meal) {
    return {
      success: false,
      message: `${date} ${mealTypeLabels[mealType]} 기록이 없습니다.`,
    };
  }

  // 2. 특정 음식만 삭제하는 경우
  if (foodName) {
    const items = meal.meal_items as Array<{ id: string; name: string; calories: number }>;
    const targetItem = items.find(
      (item) => item.name.toLowerCase().includes(foodName.toLowerCase())
    );

    if (!targetItem) {
      return {
        success: false,
        message: `${mealTypeLabels[mealType]}에서 "${foodName}"을(를) 찾을 수 없습니다. 기록된 음식: ${items.map((i) => i.name).join(', ')}`,
      };
    }

    // 해당 아이템 삭제
    const { error: deleteError } = await supabase
      .from('meal_items')
      .delete()
      .eq('id', targetItem.id);

    if (deleteError) {
      console.error('Delete item error:', deleteError);
      return { success: false, message: '음식 삭제 중 오류가 발생했습니다.' };
    }

    // total_calories 업데이트
    const newTotalCalories = Math.max(0, (meal.total_calories || 0) - targetItem.calories);
    await supabase
      .from('meals')
      .update({ total_calories: newTotalCalories })
      .eq('id', meal.id);

    // 남은 아이템이 없으면 meal도 삭제
    if (items.length === 1) {
      await supabase.from('meals').delete().eq('id', meal.id);
      return {
        success: true,
        message: `${mealTypeLabels[mealType]} "${targetItem.name}" 삭제 완료. (마지막 항목이어서 식단 전체 삭제됨)`,
      };
    }

    return {
      success: true,
      message: `${mealTypeLabels[mealType]} "${targetItem.name}" (${targetItem.calories}kcal) 삭제 완료!`,
    };
  }

  // 3. 끼니 전체 삭제
  const { error: deleteError } = await supabase
    .from('meals')
    .delete()
    .eq('id', meal.id);

  if (deleteError) {
    console.error('Delete meal error:', deleteError);
    return { success: false, message: '식단 삭제 중 오류가 발생했습니다.' };
  }

  const items = meal.meal_items as Array<{ name: string }>;
  const deletedFoods = items.map((i) => i.name).join(', ');

  return {
    success: true,
    message: `${mealTypeLabels[mealType]} 전체 삭제 완료! (${deletedFoods})`,
  };
}

/**
 * 식단 수정 함수
 */
async function updateMealData(
  date: string,
  mealType: MealType,
  oldFoodName: string,
  newFood: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
): Promise<{ success: boolean; message: string }> {
  const userId = getCurrentUserId();

  const mealTypeLabels: Record<MealType, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식',
  };

  // 1. 해당 meal 조회
  const { data: meal, error: fetchError } = await supabase
    .from('meals')
    .select(`
      id,
      total_calories,
      meal_items (id, name, calories)
    `)
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (fetchError) {
    console.error('Update meal fetch error:', fetchError);
    return { success: false, message: '식단 조회 중 오류가 발생했습니다.' };
  }

  if (!meal) {
    return {
      success: false,
      message: `${date} ${mealTypeLabels[mealType]} 기록이 없습니다.`,
    };
  }

  // 2. 수정할 음식 찾기
  const items = meal.meal_items as Array<{ id: string; name: string; calories: number }>;
  const targetItem = items.find(
    (item) => item.name.toLowerCase().includes(oldFoodName.toLowerCase())
  );

  if (!targetItem) {
    return {
      success: false,
      message: `${mealTypeLabels[mealType]}에서 "${oldFoodName}"을(를) 찾을 수 없습니다. 기록된 음식: ${items.map((i) => i.name).join(', ')}`,
    };
  }

  // 3. 음식 정보 업데이트
  const { error: updateError } = await supabase
    .from('meal_items')
    .update({
      name: newFood.name,
      calories: newFood.calories,
      protein_g: newFood.protein,
      carbs_g: newFood.carbs,
      fat_g: newFood.fat,
    })
    .eq('id', targetItem.id);

  if (updateError) {
    console.error('Update item error:', updateError);
    return { success: false, message: '음식 수정 중 오류가 발생했습니다.' };
  }

  // 4. total_calories 재계산
  const caloriesDiff = newFood.calories - targetItem.calories;
  const newTotalCalories = Math.max(0, (meal.total_calories || 0) + caloriesDiff);

  await supabase
    .from('meals')
    .update({ total_calories: newTotalCalories })
    .eq('id', meal.id);

  return {
    success: true,
    message: `${mealTypeLabels[mealType]} "${targetItem.name}" → "${newFood.name}" (${newFood.calories}kcal) 수정 완료!`,
  };
}

// Fetch chat messages from Supabase
export function useChatMessages(limit: number = 50) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: chatKeys.messages(),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      // 최신순으로 가져온 후 시간순으로 정렬하여 반환
      return (data || []).reverse();
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

      // 2. Immediately update cache to show user message (optimistic update)
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
        return old ? [...old, userMsg] : [userMsg];
      });

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

      // 5. Call OpenAI API with Function Calling
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: foodLoggingTools,
        tool_choice: 'auto',
        max_tokens: 500,
        temperature: persona === 'cold' ? 0.3 : persona === 'strict' ? 0.5 : 0.7,
      });

      const responseMessage = completion.choices[0]?.message;
      let assistantContent = responseMessage?.content || '';

      // 6. Handle Function Calling
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];

        // 6-1. 식단 조회 (get_meals)
        if (toolCall.function.name === 'get_meals') {
          const args = parseGetMealsArgs(toolCall.function.arguments);
          console.log('[ChatBot] get_meals args:', args);

          const result = await getMealsData(args.date!, args.meal_type!);
          console.log('[ChatBot] getMealsData result:', result);

          assistantContent = result.message;
        }

        // 6-2. 식단 삭제 (delete_meal)
        if (toolCall.function.name === 'delete_meal') {
          const args = parseDeleteMealArgs(toolCall.function.arguments);
          console.log('[ChatBot] delete_meal args:', args);

          if (args) {
            const result = await deleteMealData(args.date, args.meal_type, args.food_name);
            console.log('[ChatBot] deleteMealData result:', result);

            // 성공한 경우 UI 업데이트
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['meals'] });
              queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
            }

            assistantContent = result.message;
          }
        }

        // 6-3. 식단 수정 (update_meal)
        if (toolCall.function.name === 'update_meal') {
          const args = parseUpdateMealArgs(toolCall.function.arguments);
          console.log('[ChatBot] update_meal args:', args);

          if (args) {
            const result = await updateMealData(
              args.date,
              args.meal_type,
              args.old_food_name,
              args.new_food
            );
            console.log('[ChatBot] updateMealData result:', result);

            // 성공한 경우 UI 업데이트
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['meals'] });
              queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
            }

            assistantContent = result.message;
          }
        }

        // 6-4. 식단 기록 (log_meal)
        if (toolCall.function.name === 'log_meal') {
          const args = parseLogMealArgs(toolCall.function.arguments);
          console.log('[ChatBot] log_meal args:', args);

          if (args) {
            // 날짜 검증: AI가 잘못된 날짜를 보내면 오늘 날짜로 강제
            let validDate = getToday();
            if (args.date) {
              const inputDate = new Date(args.date);
              const today = new Date();
              const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

              // 미래 날짜이거나 1주일 이전이면 오늘로 강제
              if (inputDate > today || inputDate < oneWeekAgo) {
                console.warn('[ChatBot] Invalid date from AI, using today:', args.date);
                validDate = getToday();
              } else {
                validDate = args.date;
              }
            }

            // AI가 추정한 영양정보로 직접 저장 (DB 검색 없음)
            const logResult = await logMealDirectly(
              args.meal_type || inferMealType(),
              validDate,
              args.foods.map((f) => ({
                name: f.name,
                quantity: f.quantity || 1,
                calories: f.calories,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
              }))
            );

            console.log('[ChatBot] logResult:', logResult);

            // 성공한 경우에만 meals 쿼리 무효화하여 UI 업데이트
            if (logResult.success) {
              queryClient.invalidateQueries({ queryKey: ['meals'] });
              queryClient.invalidateQueries({ queryKey: ['todayCalories'] });
            }

            assistantContent = logResult.message;
          }
        }
      }

      // 7. Fallback if no content
      if (!assistantContent) {
        assistantContent = '응답을 생성할 수 없습니다.';
      }

      // 8. Save assistant message to Supabase
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

      // Immediately add assistant message to cache (optimistic update)
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
        return old ? [...old, assistantMsg] : [assistantMsg];
      });

      return {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    },
    // onSuccess에서 invalidateQueries 제거
    // setQueryData로 이미 캐시를 업데이트했으므로 불필요
    // invalidateQueries가 setQueryData와 경쟁하여 채팅이 사라지는 버그 발생
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

/**
 * AI 분석 전용 함수 (채팅 기록 저장 안 함)
 * MyPage에서 주간 분석 리포트 생성에 사용
 */
export function useAIAnalysis() {
  return useMutation({
    mutationFn: async ({
      persona = 'bright' as CoachPersona,
    }: {
      persona?: CoachPersona;
    }): Promise<string> => {
      const userId = getCurrentUserId();

      // 1. 사용자 프로필 가져오기
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // 2. 최근 7일 체중 기록 가져오기
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoYear = weekAgo.getFullYear();
      const weekAgoMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const weekAgoDay = String(weekAgo.getDate()).padStart(2, '0');
      const weekAgoStr = `${weekAgoYear}-${weekAgoMonth}-${weekAgoDay}`;

      const { data: weightLogs } = await supabase
        .from('progress_logs')
        .select('date, weight_kg, body_fat_percent')
        .eq('user_id', userId)
        .gte('date', weekAgoStr)
        .order('date', { ascending: true });

      // 3. 최근 7일 식단 기록 가져오기
      const { data: meals } = await supabase
        .from('meals')
        .select(`
          date,
          meal_type,
          total_calories,
          meal_items (name, calories, protein_g, carbs_g, fat_g)
        `)
        .eq('user_id', userId)
        .gte('date', weekAgoStr)
        .order('date', { ascending: true });

      // 4. 컨텍스트 문자열 생성
      let contextStr = '## 사용자 정보\n';
      if (profile) {
        contextStr += `- 현재 체중: ${profile.current_weight_kg}kg\n`;
        contextStr += `- 목표 체중: ${profile.goal_weight_kg}kg\n`;
        contextStr += `- 일일 목표 칼로리: ${profile.target_calories}kcal\n`;
        contextStr += `- 활동 수준: ${profile.activity_level}\n`;
      }

      contextStr += '\n## 최근 7일 체중 기록\n';
      if (weightLogs && weightLogs.length > 0) {
        weightLogs.forEach((log) => {
          contextStr += `- ${log.date}: ${log.weight_kg}kg`;
          if (log.body_fat_percent) contextStr += ` (체지방 ${log.body_fat_percent}%)`;
          contextStr += '\n';
        });

        // 체중 변화 계산
        const firstWeight = weightLogs[0].weight_kg;
        const lastWeight = weightLogs[weightLogs.length - 1].weight_kg;
        const weightChange = lastWeight - firstWeight;
        contextStr += `- 주간 체중 변화: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg\n`;
      } else {
        contextStr += '- 기록 없음\n';
      }

      contextStr += '\n## 최근 7일 식단 요약\n';
      if (meals && meals.length > 0) {
        // 날짜별 칼로리 합계
        const dailyCalories: Record<string, number> = {};
        meals.forEach((meal) => {
          if (!dailyCalories[meal.date]) dailyCalories[meal.date] = 0;
          dailyCalories[meal.date] += meal.total_calories || 0;
        });

        Object.entries(dailyCalories).forEach(([date, cal]) => {
          contextStr += `- ${date}: ${cal}kcal\n`;
        });

        const avgCalories = Object.values(dailyCalories).reduce((a, b) => a + b, 0) / Object.keys(dailyCalories).length;
        contextStr += `- 일 평균 섭취: ${Math.round(avgCalories)}kcal\n`;
      } else {
        contextStr += '- 기록 없음\n';
      }

      // 5. AI 분석 요청 프롬프트
      const analysisPrompt = `당신은 전문 식단 코치입니다. 아래 사용자의 최근 7일 데이터를 분석하여 간결하고 실용적인 피드백을 제공해주세요.

${contextStr}

다음 형식으로 응답해주세요:
1. 주간 요약 (1-2문장)
2. 잘한 점 (1-2개)
3. 개선할 점 (1-2개)
4. 이번 주 추천 액션 (구체적으로 1개)

한국어로 응답하고, 격려적이면서도 실질적인 조언을 해주세요.`;

      // 6. OpenAI API 호출
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompts[persona] },
          { role: 'user', content: analysisPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      return response;
    },
  });
}

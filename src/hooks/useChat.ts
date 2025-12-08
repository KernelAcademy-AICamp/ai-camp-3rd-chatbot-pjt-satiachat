import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type { ChatMessage, MealType } from '@/types/domain';
import OpenAI from 'openai';
import { parseLogMealArgs, parseGetMealsArgs, parseDeleteMealArgs, parseUpdateMealArgs, getToolsForIntent } from '@/lib/ai/food-tools';
import { classifyIntent, classifyCasualChat, type ChatIntent } from '@/lib/ai/intent-classifier';
import { detectSituation, type SituationType, type SituationContext } from '@/lib/ai/situation-detector';
import {
  mealResponses,
  casualResponses,
  getRandomResponse,
  getAchievementResponse,
  getStreakMilestoneResponse,
} from '@/lib/ai/persona-responses';

// OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type CoachPersona = 'cold' | 'bright' | 'strict';

// ============================================
// 모듈화된 프롬프트 시스템
// ============================================

// 핵심 규칙 (압축, 항상 포함) - 오늘 날짜 명시!
const CORE_RULES = `당신은 식단 관리 AI 코치입니다.
한국어로 2-3문장 이내 응답. 캐릭터 말투 필수 유지.
중요: 날짜 미언급시 무조건 오늘 날짜 사용.`;

// 페르소나별 프롬프트 (압축 + 예시)
const PERSONA_PROMPTS: Record<CoachPersona, string> = {
  cold: `냥이 코치 (도도한 고양이)
- 말투: ~냐/~다냥 (예: "기록했다냥", "확인해봐냥")
- 이모지 절대 금지. 팩트 위주. 짧고 핵심만.`,
  bright: `댕댕이 코치 (밝은 강아지)
- 말투: 멍멍! ~요! (예: "기록했어요! 멍멍!", "잘했어요!")
- 이모지 적극 사용 🐾🦴💪✨🎉 긍정적, 격려.`,
  strict: `꿀꿀이 코치 (엄격한 돼지)
- 말투: 꿀꿀! ~야! (예: "꿀꿀! 기록했어!", "제대로 먹어!")
- 이모지 최소. 칼로리 엄격. 핑계 금지!`,
};

// 조건부 모듈 (필요시만 포함)
const PROMPT_MODULES = {
  calorie_guide: `칼로리 추정: 밥300, 찌개150, 치킨450, 라면500, 샐러드200, 닭가슴살150, 아메리카노5`,
  meal_logging: `음식 언급 시 log_meal 함수 호출. 영양정보 추정하여 기록.`,
  meal_query: `조회 요청 시 get_meals 함수 호출.`,
  meal_modify: `삭제/수정 요청 시 해당 함수 호출.
패턴: "A 대신 B" → old_food_name=A, new_food=B
날짜 미언급 = 오늘. "어제"는 오늘-1일.`,
  late_night: `야식 상황. 건강 영향 가볍게 언급하되 비난하지 마세요.`,
  overeating: `과식 상황. 격려하면서 내일 계획 제안.`,
  healthy: `건강한 선택. 적극적으로 칭찬.`,
  junk: `고칼로리 음식. 균형에 대해 가볍게 언급.`,
  goal_achieved: `목표 달성! 크게 축하.`,
};

// 동적 시스템 프롬프트 빌더
function buildSystemPrompt(
  persona: CoachPersona,
  intent: ChatIntent,
  situation?: SituationType,
  userContext?: { todayCalories: number; targetCalories: number }
): string {
  // 오늘 날짜를 항상 명시!
  const todayDate = getToday();
  const parts: string[] = [
    CORE_RULES,
    `오늘 날짜: ${todayDate}`,
    PERSONA_PROMPTS[persona],
  ];

  // 의도별 모듈 추가
  if (intent === 'meal_logging') {
    parts.push(PROMPT_MODULES.calorie_guide);
    parts.push(PROMPT_MODULES.meal_logging);
  } else if (intent === 'meal_query') {
    parts.push(PROMPT_MODULES.meal_query);
  } else if (intent === 'meal_modify') {
    parts.push(PROMPT_MODULES.meal_modify);
  }

  // 상황별 모듈 추가
  if (situation && situation !== 'default') {
    const situationModule = PROMPT_MODULES[situation as keyof typeof PROMPT_MODULES];
    if (situationModule) {
      parts.push(situationModule);
    }
  }

  // 사용자 컨텍스트 (식단 관련 의도일 때만)
  if (userContext && intent !== 'casual_chat') {
    const ratio = Math.round((userContext.todayCalories / userContext.targetCalories) * 100);
    parts.push(`현재 상황: 오늘 ${userContext.todayCalories}kcal / 목표 ${userContext.targetCalories}kcal (${ratio}%)`);
  }

  return parts.join('\n');
}

// 기존 전체 프롬프트 (하위 호환성)
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

const systemPrompts: Record<CoachPersona, string> = {
  cold: `${BASE_INSTRUCTIONS}

## 페르소나: 냥이 코치 🐱
- 도도한 고양이 캐릭터
- 팩트 위주, 감정 표현 최소화
- 이모지 사용 금지
- "~냐", "~다냥" 같은 고양이 말투 가끔 사용
- 짧고 핵심만 전달`,

  bright: `${BASE_INSTRUCTIONS}

## 페르소나: 댕댕이 코치 🐕
- 열정적이고 밝은 강아지 캐릭터
- 긍정적, 격려하는 톤
- 이모지 적극 사용 🐾🦴💪
- "멍멍!", "잘했어요!" 같은 강아지 말투
- 꼬리 흔들며 응원하는 느낌`,

  strict: `${BASE_INSTRUCTIONS}

## 페르소나: 꿀꿀이 코치 🐷
- 먹는 것에 진심인 돼지 캐릭터
- 칼로리에 매우 엄격함
- "꿀꿀!", "핑계 금지!" 같은 돼지 말투
- 단호하고 직설적
- 목표 달성에 집중, 타협 없음`,
};

// Chat type for diet conversations
const CHAT_TYPE = 'diet';

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
        .eq('chat_type', CHAT_TYPE)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      // 최신순으로 가져온 후 시간순으로 정렬하여 반환
      return (data || []).reverse();
    },
  });
}

/**
 * 사용자 컨텍스트 조회 (조건부 실행)
 * - 오늘 총 섭취 칼로리
 * - 목표 칼로리
 * - 연속 기록 일수
 */
async function fetchUserContext(userId: string): Promise<{
  todayCalories: number;
  targetCalories: number;
  consecutiveDays: number;
}> {
  const today = getToday();

  // 1. 오늘 총 칼로리 조회
  const { data: todayMeals } = await supabase
    .from('meals')
    .select('total_calories')
    .eq('user_id', userId)
    .eq('date', today);

  const todayCalories = (todayMeals || []).reduce(
    (sum, meal) => sum + (meal.total_calories || 0),
    0
  );

  // 2. 목표 칼로리 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('target_calories')
    .eq('user_id', userId)
    .single();

  const targetCalories = profile?.target_calories || 2000;

  // 3. 연속 기록 일수 계산
  let consecutiveDays = 0;
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1); // 어제부터 시작

  // 최대 100일까지 체크
  for (let i = 0; i < 100; i++) {
    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const day = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

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

  return { todayCalories, targetCalories, consecutiveDays };
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
      // 1. 의도 분류 (키워드 기반, 빠름)
      const intent = classifyIntent(content);
      console.log('[ChatBot] Intent:', intent);

      // 2. Save user message to Supabase
      const { data: userMsg, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'user',
          content,
          chat_type: CHAT_TYPE,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 3. Immediately update cache to show user message (optimistic update)
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
        return old ? [...old, userMsg] : [userMsg];
      });

      // 4. 조건부 사용자 컨텍스트 조회 (식단 관련 의도일 때만)
      let userContext: { todayCalories: number; targetCalories: number; consecutiveDays: number } | undefined;

      if (intent !== 'casual_chat') {
        userContext = await fetchUserContext(userId);
        console.log('[ChatBot] User context:', userContext);
      }

      // 5. 상황 감지 (식단 기록 의도일 때)
      let situation: SituationType = 'default';
      if (intent === 'meal_logging' && userContext) {
        const currentHour = new Date().getHours();
        // 음식 키워드 추출 (간단히)
        const foodMentions = content.split(/[,\s]+/).filter(word => word.length > 1);

        situation = detectSituation({
          currentHour,
          todayCalories: userContext.todayCalories,
          targetCalories: userContext.targetCalories,
          foods: foodMentions,
          consecutiveDays: userContext.consecutiveDays,
          isFirstMealToday: userContext.todayCalories === 0,
        });
        console.log('[ChatBot] Situation:', situation);
      }

      // 6. Get recent messages for context
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', userId)
        .eq('chat_type', CHAT_TYPE)
        .order('created_at', { ascending: false })
        .limit(10);

      // 7. 동적 시스템 프롬프트 빌드 (토큰 효율화)
      const systemPrompt = buildSystemPrompt(persona, intent, situation, userContext);
      console.log('[ChatBot] System prompt length:', systemPrompt.length);

      // 8. Build messages array for OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...(recentMessages || []).reverse().map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // 9. 의도별 도구 선택 (토큰 절감)
      const tools = getToolsForIntent(intent);
      console.log('[ChatBot] Tools count:', tools.length);

      // 10. Call OpenAI API
      const completionParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: persona === 'cold' ? 0.3 : persona === 'strict' ? 0.5 : 0.7,
      };

      // 도구가 있을 때만 추가
      if (tools.length > 0) {
        completionParams.tools = tools;
        completionParams.tool_choice = 'auto';
      }

      const completion = await openai.chat.completions.create(completionParams);

      const responseMessage = completion.choices[0]?.message;
      let assistantContent = responseMessage?.content || '';
      let loggedFoods: string[] = [];

      // 11. Handle Function Calling
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];

        // 11-1. 식단 조회 (get_meals) + 캐릭터 말투 적용
        if (toolCall.function.name === 'get_meals') {
          const args = parseGetMealsArgs(toolCall.function.arguments);
          console.log('[ChatBot] get_meals args:', args);

          const result = await getMealsData(args.date!, args.meal_type!);
          console.log('[ChatBot] getMealsData result:', result);

          // 페르소나별 조회 응답
          const queryPrefixes: Record<CoachPersona, string[]> = {
            cold: ['확인했다냥.', '조회했다냥.', '여기 있다냥.'],
            bright: ['확인했어요! 🔍', '찾았어요! 📋', '여기 있어요! ✨'],
            strict: ['꿀꿀! 확인했어!', '조회 완료야!', '여기 봐!'],
          };
          const prefix = getRandomResponse(queryPrefixes[persona]);
          assistantContent = `${prefix} ${result.message}`;
        }

        // 11-2. 식단 삭제 (delete_meal) + 캐릭터 말투 적용
        if (toolCall.function.name === 'delete_meal') {
          const args = parseDeleteMealArgs(toolCall.function.arguments);
          console.log('[ChatBot] delete_meal args:', args);

          if (args) {
            const result = await deleteMealData(args.date, args.meal_type, args.food_name);
            console.log('[ChatBot] deleteMealData result:', result);

            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['meals'] });
              queryClient.invalidateQueries({ queryKey: ['todayCalories'] });

              // 페르소나별 삭제 성공 응답
              const deleteSuffixes: Record<CoachPersona, string[]> = {
                cold: ['지웠다냥.', '삭제했다냥. 없던 일로.', '처리했다냥.'],
                bright: ['삭제했어요! 새로 시작해요! 💪', '지웠어요! 괜찮아요! 🐾', '처리 완료! ✨'],
                strict: ['꿀꿀! 삭제했어!', '지웠어! 다음엔 제대로!', '처리 완료야!'],
              };
              assistantContent = `${result.message} ${getRandomResponse(deleteSuffixes[persona])}`;
            } else {
              // 페르소나별 삭제 실패 응답
              const deleteFailSuffixes: Record<CoachPersona, string[]> = {
                cold: ['그런 기록 없다냥.', '찾을 수 없다냥.'],
                bright: ['기록을 못 찾았어요! 다시 확인해볼까요? 🤔', '없는 것 같아요! 💦'],
                strict: ['꿀꿀! 없는 기록이야!', '못 찾겠어! 다시 확인해!'],
              };
              assistantContent = `${result.message} ${getRandomResponse(deleteFailSuffixes[persona])}`;
            }
          }
        }

        // 11-3. 식단 수정 (update_meal) + 캐릭터 말투 적용
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

            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['meals'] });
              queryClient.invalidateQueries({ queryKey: ['todayCalories'] });

              // 페르소나별 수정 성공 응답
              const updateSuffixes: Record<CoachPersona, string[]> = {
                cold: ['바꿨다냥.', '수정했다냥. 확인해봐.', '고쳤다냥.'],
                bright: ['수정했어요! 잘했어요! 🐾', '바꿨어요! 완벽해요! 💪', '고쳤어요! ✨'],
                strict: ['꿀꿀! 수정 완료!', '바꿨어! 제대로네!', '고쳤어! 이제 맞아!'],
              };
              assistantContent = `${result.message} ${getRandomResponse(updateSuffixes[persona])}`;
            } else {
              // 페르소나별 수정 실패 응답
              const updateFailSuffixes: Record<CoachPersona, string[]> = {
                cold: ['그 음식 기록이 없다냥.', '찾을 수 없다냥. 다시 확인해봐.'],
                bright: ['기록을 못 찾았어요! 다시 확인해볼까요? 🤔', '그 음식이 없는 것 같아요! 💦'],
                strict: ['꿀꿀! 없는 기록이야!', '못 찾겠어! 제대로 말해!'],
              };
              assistantContent = `${result.message} ${getRandomResponse(updateFailSuffixes[persona])}`;
            }
          }
        }

        // 11-4. 식단 기록 (log_meal) + 캐릭터 반응 추가
        if (toolCall.function.name === 'log_meal') {
          const args = parseLogMealArgs(toolCall.function.arguments);
          console.log('[ChatBot] log_meal args:', args);

          if (args) {
            // 날짜 검증
            let validDate = getToday();
            if (args.date) {
              const inputDate = new Date(args.date);
              const today = new Date();
              const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

              if (inputDate > today || inputDate < oneWeekAgo) {
                console.warn('[ChatBot] Invalid date from AI, using today:', args.date);
                validDate = getToday();
              } else {
                validDate = args.date;
              }
            }

            // 음식 이름 추출 (상황 감지용)
            loggedFoods = args.foods.map(f => f.name);

            // AI가 추정한 영양정보로 직접 저장
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

            if (logResult.success) {
              queryClient.invalidateQueries({ queryKey: ['meals'] });
              queryClient.invalidateQueries({ queryKey: ['todayCalories'] });

              // 🎯 캐릭터 반응 추가 (핵심 개선!)
              const newCalories = args.foods.reduce((sum, f) => sum + f.calories, 0);
              const updatedTodayCalories = (userContext?.todayCalories || 0) + newCalories;

              // 상황 재감지 (기록 후)
              const postSituation = detectSituation({
                currentHour: new Date().getHours(),
                todayCalories: updatedTodayCalories,
                targetCalories: userContext?.targetCalories || 2000,
                foods: loggedFoods,
                consecutiveDays: userContext?.consecutiveDays || 0,
                isFirstMealToday: false,
              });

              // 페르소나별 랜덤 멘트 선택
              const responses = mealResponses[persona][postSituation];
              const characterResponse = getRandomResponse(responses);

              // 달성률 멘트 추가
              const achievementComment = userContext?.targetCalories
                ? ' ' + getAchievementResponse(persona, updatedTodayCalories, userContext.targetCalories)
                : '';

              // 연속 기록 마일스톤 체크
              const streakComment = getStreakMilestoneResponse(persona, userContext?.consecutiveDays || 0);

              // 최종 응답 조합
              assistantContent = characterResponse + achievementComment + (streakComment ? '\n\n' + streakComment : '');
            } else {
              assistantContent = logResult.message;
            }
          }
        }
      }

      // 12. 일상 대화 처리 (Function Calling 없이)
      if (intent === 'casual_chat' && !assistantContent) {
        // AI 응답을 그대로 사용 (캐릭터성 유지됨)
        assistantContent = responseMessage?.content || '';

        // AI 응답이 비었으면 멘트 풀에서 가져오기
        if (!assistantContent) {
          const casualType = classifyCasualChat(content);
          const responses = casualResponses[persona][casualType];
          assistantContent = getRandomResponse(responses);
        }
      }

      // 13. Fallback if no content
      if (!assistantContent) {
        assistantContent = '응답을 생성할 수 없습니다.';
      }

      // 14. Save assistant message to Supabase
      const { data: assistantMsg, error: assistantError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          chat_type: CHAT_TYPE,
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
        .eq('user_id', userId)
        .eq('chat_type', CHAT_TYPE);

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

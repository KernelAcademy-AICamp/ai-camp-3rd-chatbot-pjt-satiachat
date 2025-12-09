/**
 * OpenAI Function Calling 도구 정의
 * AI가 사용자의 음식 섭취 언급을 인식하고 영양정보를 추정하여 기록합니다.
 */

import type OpenAI from 'openai';

/**
 * 오늘 날짜 반환 (YYYY-MM-DD) - 로컬 타임존 기준
 */
function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 개별 도구 정의 (조건부 로딩용)
export const getMealsTool: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_meals',
    description: `사용자의 식단 기록을 조회합니다.
사용자가 "오늘 뭐 먹었지?", "아침에 뭐 먹었어?", "어제 식단 알려줘" 등 식단 조회를 요청하면 이 함수를 호출하세요.`,
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'YYYY-MM-DD 형식의 날짜. 기본값은 오늘.',
        },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack', 'all'],
          description: '조회할 식사 종류. 기본값은 "all".',
        },
      },
      required: [],
    },
  },
};

export const deleteMealTool: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delete_meal',
    description: `사용자의 식단 기록을 삭제합니다.

예시:
- "점심 피자 지워줘" → meal_type: "lunch", food_name: "피자"
- "아침 취소해줘" → meal_type: "breakfast" (전체 삭제)
- "어제 저녁 삭제" → date: 어제날짜, meal_type: "dinner"

중요: 날짜를 언급하지 않으면 반드시 오늘 날짜를 사용하세요.`,
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'YYYY-MM-DD 형식. 미지정시 오늘 날짜 사용. "어제"는 오늘-1일로 계산.'
        },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: '삭제할 식사 종류.',
        },
        food_name: { type: 'string', description: '삭제할 특정 음식 이름. 미지정시 해당 끼니 전체 삭제.' },
      },
      required: ['meal_type'],
    },
  },
};

export const updateMealTool: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'update_meal',
    description: `사용자의 식단 기록을 수정합니다.

패턴 인식 (중요!):
- "A 대신 B 먹었어" → old_food_name: "A", new_food.name: "B"
- "A 말고 B였어" → old_food_name: "A", new_food.name: "B"
- "A를 B로 바꿔줘" → old_food_name: "A", new_food.name: "B"

예시:
- "점심에 피자 대신 닭가슴살 샐러드 먹었어, 수정해줘"
  → meal_type: "lunch", old_food_name: "피자", new_food: {name: "닭가슴살 샐러드", calories: 350, ...}
- "아침 라면을 계란후라이로 바꿔"
  → meal_type: "breakfast", old_food_name: "라면", new_food: {name: "계란후라이", calories: 180, ...}

중요: 날짜를 언급하지 않으면 반드시 오늘 날짜를 사용하세요.
칼로리 추정: 밥300, 치킨450, 라면500, 샐러드200, 닭가슴살150, 계란후라이180`,
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'YYYY-MM-DD 형식. 미지정시 오늘 날짜 사용. "어제"는 오늘-1일로 계산.'
        },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: '수정할 식사 종류. "점심"=lunch, "아침"=breakfast, "저녁"=dinner',
        },
        old_food_name: {
          type: 'string',
          description: '수정 대상 기존 음식 이름. "A 대신 B"에서 A에 해당.'
        },
        new_food: {
          type: 'object',
          description: '새로운 음식 정보. "A 대신 B"에서 B에 해당. 영양정보 추정 필수.',
          properties: {
            name: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fat'],
        },
      },
      required: ['meal_type', 'old_food_name', 'new_food'],
    },
  },
};

export const logMealTool: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'log_meal',
    description: `사용자가 먹은 음식을 기록합니다.
"~먹었어", "~섭취했어" 등 음식 섭취 언급 시 호출하세요.

칼로리 추정: 밥300, 국/찌개100-200, 치킨1/4마리450, 라면500`,
    parameters: {
      type: 'object',
      properties: {
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: '식사 종류 (시간 기준: 아침5-10시, 점심10-15시, 저녁15-21시, 그 외 간식)',
        },
        foods: {
          type: 'array',
          description: '먹은 음식들',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '음식 이름과 양' },
              quantity: { type: 'number', description: '인분 수 (기본값 1)' },
              calories: { type: 'number', description: '총 칼로리 (kcal)' },
              protein: { type: 'number', description: '단백질 (g)' },
              carbs: { type: 'number', description: '탄수화물 (g)' },
              fat: { type: 'number', description: '지방 (g)' },
            },
            required: ['name', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
        date: { type: 'string', description: 'YYYY-MM-DD 형식의 날짜.' },
      },
      required: ['meal_type', 'foods'],
    },
  },
};

// 전체 도구 배열 (기존 호환성 유지)
export const foodLoggingTools: OpenAI.Chat.ChatCompletionTool[] = [
  getMealsTool,
  deleteMealTool,
  updateMealTool,
  logMealTool,
];

// 의도별 도구 매핑 (조건부 로딩용)
import type { ChatIntent } from './intent-classifier';

export function getToolsForIntent(intent: ChatIntent): OpenAI.Chat.ChatCompletionTool[] {
  switch (intent) {
    case 'meal_logging':
      return [logMealTool];
    case 'meal_query':
      return [getMealsTool];
    case 'meal_modify':
      return [deleteMealTool, updateMealTool];
    case 'casual_chat':
      return []; // 일상 대화는 도구 없음 → 토큰 절감
    default:
      return [];
  }
}

// ============================================
// 타입 및 파싱 함수
// ============================================

/**
 * get_meals 함수의 인자 타입
 */
export interface GetMealsArgs {
  date?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all';
}

/**
 * get_meals 인자 파싱
 */
export function parseGetMealsArgs(argsString: string): GetMealsArgs {
  try {
    const args = JSON.parse(argsString);
    return {
      date: args.date || getTodayLocal(),
      meal_type: args.meal_type || 'all',
    };
  } catch {
    return {
      date: getTodayLocal(),
      meal_type: 'all',
    };
  }
}

/**
 * delete_meal 함수의 인자 타입
 */
export interface DeleteMealArgs {
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name?: string;
}

/**
 * delete_meal 인자 파싱
 */
export function parseDeleteMealArgs(argsString: string): DeleteMealArgs | null {
  try {
    const args = JSON.parse(argsString);
    if (!args.meal_type) return null;
    return {
      date: args.date || getTodayLocal(),
      meal_type: args.meal_type,
      food_name: args.food_name,
    };
  } catch {
    return null;
  }
}

/**
 * update_meal 함수의 인자 타입
 */
export interface UpdateMealArgs {
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  old_food_name: string;
  new_food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * update_meal 인자 파싱
 */
export function parseUpdateMealArgs(argsString: string): UpdateMealArgs | null {
  try {
    const args = JSON.parse(argsString);
    if (!args.meal_type || !args.old_food_name || !args.new_food) return null;
    return {
      date: args.date || getTodayLocal(),
      meal_type: args.meal_type,
      old_food_name: args.old_food_name,
      new_food: {
        name: args.new_food.name,
        calories: args.new_food.calories || 0,
        protein: args.new_food.protein || 0,
        carbs: args.new_food.carbs || 0,
        fat: args.new_food.fat || 0,
      },
    };
  } catch {
    return null;
  }
}

/**
 * log_meal 함수의 인자 타입 (AI가 영양정보 직접 추정)
 */
export interface LogMealArgs {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Array<{
    name: string;
    quantity?: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  date?: string;
}

/**
 * Function Calling 결과를 파싱
 */
export function parseLogMealArgs(argsString: string): LogMealArgs | null {
  try {
    const args = JSON.parse(argsString);

    // 필수 필드 검증
    if (!args.meal_type || !args.foods || !Array.isArray(args.foods)) {
      return null;
    }

    // 날짜 기본값 설정
    if (!args.date) {
      args.date = getTodayLocal();
    }

    // 각 음식의 기본값 설정
    args.foods = args.foods.map((food: any) => ({
      name: food.name,
      quantity: food.quantity || 1,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
    }));

    return args as LogMealArgs;
  } catch (error) {
    console.error('Failed to parse log_meal args:', error);
    return null;
  }
}

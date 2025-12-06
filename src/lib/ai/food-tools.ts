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

export const foodLoggingTools: OpenAI.Chat.ChatCompletionTool[] = [
  // 1. 식단 조회 기능
  {
    type: 'function',
    function: {
      name: 'get_meals',
      description: `사용자의 식단 기록을 조회합니다.
사용자가 "오늘 뭐 먹었지?", "아침에 뭐 먹었어?", "어제 식단 알려줘", "이번주 먹은거" 등 식단 조회를 요청하면 이 함수를 호출하세요.

조회 후 결과를 친절하게 요약해서 알려주세요:
- 각 끼니별 음식 목록
- 총 칼로리 및 영양소 합계
- 목표 대비 진행 상황 (가능한 경우)`,
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'YYYY-MM-DD 형식의 날짜. 기본값은 오늘. "어제"는 어제 날짜, "이번주"는 최근 7일.',
          },
          meal_type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack', 'all'],
            description: '조회할 식사 종류. 기본값은 "all" (전체).',
          },
        },
        required: [],
      },
    },
  },
  // 2. 식단 삭제 기능
  {
    type: 'function',
    function: {
      name: 'delete_meal',
      description: `사용자의 식단 기록을 삭제합니다.
사용자가 "취소해줘", "삭제해줘", "지워줘", "없던걸로 해줘" 등 삭제를 요청하면 이 함수를 호출하세요.

삭제 전에 먼저 get_meals로 조회해서 어떤 기록이 있는지 확인하고, 삭제할 대상을 명확히 파악하세요.
삭제 완료 후 결과를 알려주세요.`,
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'YYYY-MM-DD 형식의 날짜. 기본값은 오늘.',
          },
          meal_type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: '삭제할 식사 종류.',
          },
          food_name: {
            type: 'string',
            description: '삭제할 특정 음식 이름 (선택). 지정하지 않으면 해당 끼니 전체 삭제.',
          },
        },
        required: ['meal_type'],
      },
    },
  },
  // 3. 식단 수정 기능
  {
    type: 'function',
    function: {
      name: 'update_meal',
      description: `사용자의 식단 기록을 수정합니다.
사용자가 "바꿔줘", "수정해줘", "~가 아니라 ~였어", "~로 변경해줘" 등 수정을 요청하면 이 함수를 호출하세요.

수정 완료 후 변경된 내용을 알려주세요.`,
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'YYYY-MM-DD 형식의 날짜. 기본값은 오늘.',
          },
          meal_type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: '수정할 식사 종류.',
          },
          old_food_name: {
            type: 'string',
            description: '수정 대상 기존 음식 이름.',
          },
          new_food: {
            type: 'object',
            description: '새로운 음식 정보',
            properties: {
              name: { type: 'string', description: '새 음식 이름' },
              calories: { type: 'number', description: '새 음식 칼로리' },
              protein: { type: 'number', description: '단백질 (g)' },
              carbs: { type: 'number', description: '탄수화물 (g)' },
              fat: { type: 'number', description: '지방 (g)' },
            },
            required: ['name', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
        required: ['meal_type', 'old_food_name', 'new_food'],
      },
    },
  },
  // 4. 식단 기록 기능
  {
    type: 'function',
    function: {
      name: 'log_meal',
      description: `사용자가 먹은 음식을 기록합니다.
"~먹었어", "~섭취했어", "~먹음" 등 음식 섭취를 말하면 호출하세요.
영양정보(칼로리, 단백질, 탄수화물, 지방)는 일반적인 값으로 추정하세요.`,
      parameters: {
        type: 'object',
        properties: {
          meal_type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: `식사 종류.
- breakfast: 아침 (5시~10시)
- lunch: 점심 (10시~15시)
- dinner: 저녁 (15시~21시)
- snack: 간식 (그 외 시간 또는 "간식"이라고 명시한 경우)
사용자가 명시하지 않으면 현재 시간을 기준으로 추론하세요.`,
          },
          foods: {
            type: 'array',
            description: '먹은 음식들의 목록 (각 음식의 영양정보 포함)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: '음식 이름과 양 (예: "닭가슴살 200g", "치킨 1인분", "밥 1공기")',
                },
                quantity: {
                  type: 'number',
                  description: '인분 수 (기본값 1). 이미 name에 양이 포함되어 있으면 1로 설정',
                  default: 1,
                },
                calories: {
                  type: 'number',
                  description: '해당 양의 총 칼로리 (kcal). 위 가이드라인 참고하여 정확히 계산',
                },
                protein: {
                  type: 'number',
                  description: '해당 양의 총 단백질 (g)',
                },
                carbs: {
                  type: 'number',
                  description: '해당 양의 총 탄수화물 (g)',
                },
                fat: {
                  type: 'number',
                  description: '해당 양의 총 지방 (g)',
                },
              },
              required: ['name', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
          date: {
            type: 'string',
            description: 'YYYY-MM-DD 형식의 날짜. 기본값은 오늘. "어제"라고 하면 어제 날짜로 변환.',
          },
        },
        required: ['meal_type', 'foods'],
      },
    },
  },
];

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

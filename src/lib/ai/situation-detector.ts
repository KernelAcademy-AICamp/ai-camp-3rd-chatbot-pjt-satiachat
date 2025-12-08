/**
 * 식단 기록 상황을 감지하는 모듈
 * 시간, 칼로리, 음식 종류 등을 분석
 */

export type SituationType =
  | 'late_night'      // 야식 (21시 이후)
  | 'overeating'      // 과식 (목표 120% 이상)
  | 'healthy'         // 건강식 (샐러드, 닭가슴살 등)
  | 'junk'            // 정크푸드 (치킨, 피자 등)
  | 'goal_achieved'   // 목표 달성 (90-110%)
  | 'under_eating'    // 과소 섭취 (목표 50% 미만, 저녁 이후)
  | 'streak'          // 연속 기록 (3일 이상)
  | 'first_meal'      // 오늘 첫 식사
  | 'default';        // 일반 상황

// 건강식 키워드
const HEALTHY_KEYWORDS = [
  '샐러드', '닭가슴살', '현미', '두부', '야채', '채소',
  '그릭요거트', '요거트', '삶은', '구운', '찜', '계란',
  '오이', '당근', '토마토', '브로콜리', '시금치', '연어',
  '아보카도', '퀴노아', '고구마', '단백질', '프로틴'
];

// 정크푸드 키워드
const JUNK_KEYWORDS = [
  '치킨', '피자', '햄버거', '라면', '떡볶이', '족발',
  '삼겹살', '곱창', '탕수육', '짜장', '짬뽕', '튀김',
  '과자', '아이스크림', '케이크', '초콜릿', '사탕', '빵',
  '콜라', '사이다', '맥주', '소주', '막걸리', '치즈볼',
  '감자튀김', '핫도그', '나초', '팝콘'
];

export interface SituationContext {
  currentHour: number;
  todayCalories: number;
  targetCalories: number;
  foods: string[];
  consecutiveDays: number;
  isFirstMealToday: boolean;
}

/**
 * 상황 감지 (우선순위 기반)
 */
export function detectSituation(context: SituationContext): SituationType {
  const {
    currentHour,
    todayCalories,
    targetCalories,
    foods,
    consecutiveDays,
    isFirstMealToday
  } = context;

  // 1. 연속 기록 마일스톤 체크 (3, 7, 14, 30, 60, 100일)
  const milestones = [3, 7, 14, 30, 60, 100];
  if (milestones.includes(consecutiveDays)) {
    return 'streak';
  }

  // 2. 오늘 첫 식사
  if (isFirstMealToday) {
    return 'first_meal';
  }

  // 3. 야식 체크 (21시 이후 또는 5시 이전)
  if (currentHour >= 21 || currentHour < 5) {
    return 'late_night';
  }

  // 4. 칼로리 기반 상황 (목표가 있을 때만)
  if (targetCalories > 0) {
    const calorieRatio = todayCalories / targetCalories;

    // 과식 (120% 이상)
    if (calorieRatio >= 1.2) {
      return 'overeating';
    }

    // 목표 달성 (90-110%)
    if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
      return 'goal_achieved';
    }

    // 과소 섭취 (50% 미만, 저녁 이후)
    if (calorieRatio < 0.5 && currentHour >= 18) {
      return 'under_eating';
    }
  }

  // 5. 음식 유형 감지
  const foodsLower = foods.map(f => f.toLowerCase()).join(' ');

  const hasHealthy = HEALTHY_KEYWORDS.some(keyword =>
    foodsLower.includes(keyword)
  );

  const hasJunk = JUNK_KEYWORDS.some(keyword =>
    foodsLower.includes(keyword)
  );

  // 건강식만 있는 경우
  if (hasHealthy && !hasJunk) {
    return 'healthy';
  }

  // 정크푸드가 있는 경우
  if (hasJunk) {
    return 'junk';
  }

  // 6. 기본 상황
  return 'default';
}

/**
 * 현재 시간 기준 식사 타입 추론
 */
export function inferMealTypeByTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

/**
 * 음식명에서 건강식 여부 체크
 */
export function isHealthyFood(foodName: string): boolean {
  const lower = foodName.toLowerCase();
  return HEALTHY_KEYWORDS.some(k => lower.includes(k));
}

/**
 * 음식명에서 정크푸드 여부 체크
 */
export function isJunkFood(foodName: string): boolean {
  const lower = foodName.toLowerCase();
  return JUNK_KEYWORDS.some(k => lower.includes(k));
}

/**
 * 복합 상황 감지 (여러 상황이 겹칠 때 추가 멘트용)
 */
export function detectMultipleSituations(context: SituationContext): SituationType[] {
  const situations: SituationType[] = [];
  const { currentHour, todayCalories, targetCalories, foods } = context;

  // 야식
  if (currentHour >= 21 || currentHour < 5) {
    situations.push('late_night');
  }

  // 칼로리 상황
  if (targetCalories > 0) {
    const ratio = todayCalories / targetCalories;
    if (ratio >= 1.2) situations.push('overeating');
    else if (ratio >= 0.9 && ratio <= 1.1) situations.push('goal_achieved');
    else if (ratio < 0.5 && currentHour >= 18) situations.push('under_eating');
  }

  // 음식 유형
  const foodsLower = foods.map(f => f.toLowerCase()).join(' ');
  const hasHealthy = HEALTHY_KEYWORDS.some(k => foodsLower.includes(k));
  const hasJunk = JUNK_KEYWORDS.some(k => foodsLower.includes(k));

  if (hasHealthy) situations.push('healthy');
  if (hasJunk) situations.push('junk');

  return situations.length > 0 ? situations : ['default'];
}

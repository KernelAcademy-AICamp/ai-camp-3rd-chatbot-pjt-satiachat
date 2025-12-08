/**
 * 조회용 프롬프트 (query)
 * 식단 조회 + 체중 질문
 */

import { PERSONAS, type CoachPersona } from './personas';

interface WeightRecord {
  date: string;
  weight: number;
}

interface DailyCalorieRecord {
  date: string;
  calories: number;
}

export interface QueryContext {
  today: string;
  // 체중 관련
  currentWeight: number | null;
  goalWeight: number | null;
  recentWeights: WeightRecord[];
  weightTrend: 'up' | 'down' | 'stable' | 'unknown';
  // 칼로리 관련
  todayCalories: number;
  targetCalories: number;
  weeklyAvgCalories: number;
  recentDailyCalories: DailyCalorieRecord[];
}

export function buildQueryPrompt(persona: CoachPersona, context: QueryContext): string {
  // 현재 체중 정보
  const weightInfo = context.currentWeight && context.goalWeight
    ? `현재 체중: ${context.currentWeight}kg (목표: ${context.goalWeight}kg)`
    : context.currentWeight
    ? `현재 체중: ${context.currentWeight}kg`
    : '체중 정보 없음';

  // 최근 체중 변화 정보
  let weightChangeInfo = '';
  if (context.recentWeights.length >= 2) {
    const first = context.recentWeights[0];
    const last = context.recentWeights[context.recentWeights.length - 1];
    const diff = (last.weight - first.weight).toFixed(1);
    const sign = parseFloat(diff) > 0 ? '+' : '';
    weightChangeInfo = `최근 ${context.recentWeights.length}일 체중 변화: ${first.weight}kg → ${last.weight}kg (${sign}${diff}kg)`;
  } else if (context.recentWeights.length === 1) {
    weightChangeInfo = `최근 기록: ${context.recentWeights[0].date} - ${context.recentWeights[0].weight}kg`;
  } else {
    weightChangeInfo = '최근 7일 체중 기록 없음';
  }

  // 체중 추세
  const trendText = {
    up: '📈 증가 추세',
    down: '📉 감소 추세 (좋아요!)',
    stable: '➡️ 유지 중',
    unknown: '❓ 데이터 부족',
  }[context.weightTrend];

  // 오늘 칼로리 정보
  const todayPercent = context.targetCalories > 0
    ? Math.round((context.todayCalories / context.targetCalories) * 100)
    : 0;
  const remainingCalories = Math.max(0, context.targetCalories - context.todayCalories);
  const calorieInfo = `오늘: ${context.todayCalories}kcal / 목표: ${context.targetCalories}kcal (${todayPercent}%) | 남은 여유: ${remainingCalories}kcal`;

  // 주간 칼로리 정보
  let weeklyCalorieInfo = '';
  if (context.recentDailyCalories.length > 0) {
    const dailyList = context.recentDailyCalories
      .map(d => `${d.date.slice(5)}: ${d.calories}kcal`)
      .join(', ');
    weeklyCalorieInfo = `최근 ${context.recentDailyCalories.length}일 칼로리: ${dailyList}`;
  } else {
    weeklyCalorieInfo = '최근 7일 칼로리 기록 없음';
  }

  const avgDiff = context.weeklyAvgCalories - context.targetCalories;
  const avgDiffText = avgDiff > 0
    ? `목표 대비 +${avgDiff}kcal 초과`
    : avgDiff < 0
    ? `목표 대비 ${avgDiff}kcal 절약`
    : '목표 달성';

  return `${PERSONAS[persona]}

[핵심 임무]
사용자가 식단을 물어보면 반드시 get_meals 함수를 호출해서 실제 데이터를 조회해!
너는 사용자의 식단을 기억하지 못해. 반드시 함수를 호출해야만 알 수 있어!

[필수 규칙]
1. "뭐 먹었어?", "오늘 식단", "저녁 뭐 먹었지?" 등 식단 질문 → 반드시 get_meals 함수 호출!
2. 함수 호출 없이 "모른다", "기억 안 난다"라고 답하면 안 돼!
3. 체중/칼로리 질문은 아래 정보로 답변 (함수 호출 불필요)

[응답 방식]
- 함수 결과를 받으면 캐릭터 말투로 재미있게 전달
- 기록 없으면: 뭐 먹었는지 기록하라고 독려
- 기록 있으면: 음식 목록 + 칼로리 + 재치있는 코멘트
- 체중/칼로리 변화 질문: 아래 데이터 기반으로 트렌드와 함께 답변

오늘 날짜: ${context.today}

[체중 정보]
${weightInfo}
${weightChangeInfo}
추세: ${trendText}

[칼로리 정보]
${calorieInfo}
${weeklyCalorieInfo}
주간 평균: ${context.weeklyAvgCalories}kcal/일 (${avgDiffText})`;
}

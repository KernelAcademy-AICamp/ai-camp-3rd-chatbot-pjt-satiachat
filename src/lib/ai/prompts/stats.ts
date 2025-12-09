/**
 * 통계 조회용 프롬프트 (stats)
 * 칼로리/체중 수치 질문 - 함수 호출 불필요, 컨텍스트만 사용
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

export interface StatsContext {
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

export function buildStatsPrompt(persona: CoachPersona, context: StatsContext): string {
  // === 체중 정보 ===
  const weightInfo = context.currentWeight && context.goalWeight
    ? `현재: ${context.currentWeight}kg → 목표: ${context.goalWeight}kg (${context.goalWeight - context.currentWeight > 0 ? '+' : ''}${(context.goalWeight - context.currentWeight).toFixed(1)}kg)`
    : context.currentWeight
    ? `현재: ${context.currentWeight}kg`
    : '체중 기록 없음';

  let weightChangeInfo = '';
  if (context.recentWeights.length >= 2) {
    const first = context.recentWeights[0];
    const last = context.recentWeights[context.recentWeights.length - 1];
    const diff = last.weight - first.weight;
    const sign = diff > 0 ? '+' : '';
    weightChangeInfo = `최근 ${context.recentWeights.length}일: ${first.weight}kg → ${last.weight}kg (${sign}${diff.toFixed(1)}kg)`;
  } else if (context.recentWeights.length === 1) {
    weightChangeInfo = `기록: ${context.recentWeights[0].date} - ${context.recentWeights[0].weight}kg`;
  } else {
    weightChangeInfo = '최근 7일 체중 기록 없음';
  }

  const trendEmoji = {
    up: '📈 증가',
    down: '📉 감소',
    stable: '➡️ 유지',
    unknown: '❓ 데이터 부족',
  }[context.weightTrend];

  // === 칼로리 정보 ===
  const todayPercent = context.targetCalories > 0
    ? Math.round((context.todayCalories / context.targetCalories) * 100)
    : 0;
  const remaining = Math.max(0, context.targetCalories - context.todayCalories);

  let dailyCalorieList = '';
  if (context.recentDailyCalories.length > 0) {
    dailyCalorieList = context.recentDailyCalories
      .map(d => `${d.date.slice(5)}: ${d.calories}kcal`)
      .join('\n  ');
  } else {
    dailyCalorieList = '기록 없음';
  }

  const avgDiff = context.weeklyAvgCalories - context.targetCalories;
  const avgStatus = avgDiff > 0
    ? `+${avgDiff}kcal 초과`
    : avgDiff < 0
    ? `${avgDiff}kcal 절약`
    : '목표 달성';

  return `${PERSONAS[persona]}

[임무]
사용자가 칼로리나 체중 수치를 물어봤어. 아래 데이터를 기반으로 캐릭터답게 답변해!

[중요]
- 함수 호출 없이 아래 데이터만으로 답변해
- 질문에 맞는 정보를 중심으로 답변 (칼로리 질문 → 칼로리 중심, 체중 질문 → 체중 중심)
- 수치를 명확히 말해주고, 짧은 코멘트 추가
- 2-3문장으로 간결하게

오늘: ${context.today}

[체중 데이터]
${weightInfo}
${weightChangeInfo}
추세: ${trendEmoji}

[칼로리 데이터]
오늘: ${context.todayCalories}kcal / 목표: ${context.targetCalories}kcal (${todayPercent}%)
남은 여유: ${remaining}kcal
주간 평균: ${context.weeklyAvgCalories}kcal/일 (${avgStatus})

최근 일별 칼로리:
  ${dailyCalorieList}`;
}

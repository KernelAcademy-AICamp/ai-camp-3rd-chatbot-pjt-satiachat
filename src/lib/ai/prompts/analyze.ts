/**
 * 분석/피드백/조언용 프롬프트 (analyze)
 */

import { PERSONAS, type CoachPersona } from './personas';

interface WeightRecord {
  date: string;
  weight: number;
}

export interface AnalyzeContext {
  targetCalories: number;
  todayCalories: number;
  currentWeight: number | null;
  goalWeight: number | null;
  todayFoods: string[];
  consecutiveDays: number;
  // 새로 추가
  recentWeights: WeightRecord[];
  weeklyAvgCalories: number;
  weightTrend: 'up' | 'down' | 'stable' | 'unknown';
}

export function buildAnalyzePrompt(persona: CoachPersona, context: AnalyzeContext): string {
  const ratio = Math.round((context.todayCalories / context.targetCalories) * 100);
  const remaining = context.targetCalories - context.todayCalories;

  // 체중 정보
  const weightInfo = context.currentWeight && context.goalWeight
    ? `체중: ${context.currentWeight}kg → 목표 ${context.goalWeight}kg`
    : '';

  // 체중 변화 분석
  let weightChangeInfo = '';
  if (context.recentWeights.length >= 2) {
    const first = context.recentWeights[0];
    const last = context.recentWeights[context.recentWeights.length - 1];
    const diff = (last.weight - first.weight).toFixed(1);
    const sign = parseFloat(diff) > 0 ? '+' : '';
    weightChangeInfo = `최근 체중 변화: ${first.weight}kg → ${last.weight}kg (${sign}${diff}kg)`;
  }

  // 체중 추세
  const trendText = {
    up: '📈 증가 추세 (주의!)',
    down: '📉 감소 추세 (잘하고 있어!)',
    stable: '➡️ 유지 중',
    unknown: '',
  }[context.weightTrend];

  // 주간 칼로리 분석
  const weeklyCalInfo = context.weeklyAvgCalories > 0
    ? `주간 평균 칼로리: ${context.weeklyAvgCalories}kcal/일`
    : '';

  const weeklyVsTarget = context.weeklyAvgCalories > 0
    ? context.weeklyAvgCalories > context.targetCalories
      ? `(목표 대비 +${context.weeklyAvgCalories - context.targetCalories}kcal 초과)`
      : `(목표 대비 ${context.targetCalories - context.weeklyAvgCalories}kcal 여유)`
    : '';

  const foodList = context.todayFoods.length > 0
    ? context.todayFoods.join(', ')
    : '아직 기록 없음';

  return `${PERSONAS[persona]}

[임무] 사용자의 식단과 체중 변화를 분석하고 캐릭터답게 피드백해!

[절대 금지]
- 딱딱한 분석 보고서 말투 금지!
- 반드시 위 예시처럼 캐릭터 말투로 답변해!

[해야 할 것]
- 오늘 뭘 먹었는지 언급
- 달성률에 맞는 피드백
- 체중 변화 추세 언급 (데이터가 있으면)
- 앞으로 뭘 먹으면 좋을지 추천 (요청시)
- 3-4문장 이내

[오늘 현황]
- 목표: ${context.targetCalories}kcal
- 섭취: ${context.todayCalories}kcal (${ratio}%)
- 남은 여유: ${remaining}kcal
- 오늘 식단: ${foodList}
- 연속 기록: ${context.consecutiveDays}일째

[주간 트렌드]
${weightInfo ? `- ${weightInfo}` : ''}
${weightChangeInfo ? `- ${weightChangeInfo}` : ''}
${trendText ? `- ${trendText}` : ''}
${weeklyCalInfo ? `- ${weeklyCalInfo} ${weeklyVsTarget}` : ''}

[달성률별 반응]
- 0-50%: 아직 많이 먹어도 돼!
- 50-90%: 잘하고 있어!
- 90-110%: 완벽해! 칭찬!
- 110%+: 오버했어! 내일 조절하자!

[체중 추세별 반응]
- 감소 추세: 칭찬! 이대로 유지!
- 증가 추세: 살짝 주의, 식단 조절 권유
- 유지 중: 안정적! 꾸준함 칭찬`;
}

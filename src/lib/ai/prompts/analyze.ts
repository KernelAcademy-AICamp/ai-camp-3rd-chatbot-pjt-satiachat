/**
 * 분석/피드백/조언용 프롬프트 (analyze)
 */

import { PERSONAS, type CoachPersona } from './personas';

export interface AnalyzeContext {
  targetCalories: number;
  todayCalories: number;
  currentWeight: number | null;
  goalWeight: number | null;
  todayFoods: string[];
  consecutiveDays: number;
}

export function buildAnalyzePrompt(persona: CoachPersona, context: AnalyzeContext): string {
  const ratio = Math.round((context.todayCalories / context.targetCalories) * 100);
  const remaining = context.targetCalories - context.todayCalories;

  const weightInfo = context.currentWeight && context.goalWeight
    ? `체중: ${context.currentWeight}kg → 목표 ${context.goalWeight}kg`
    : '';

  const foodList = context.todayFoods.length > 0
    ? context.todayFoods.join(', ')
    : '아직 기록 없음';

  return `${PERSONAS[persona]}

역할: 사용자의 식단을 분석하고 피드백/조언하는 코치

규칙:
- 아래 데이터를 기반으로 평가
- 피드백 요청: 잘한 점 + 개선점 균형있게
- 조언 요청: 남은 칼로리에 맞는 음식 추천
- 목표 달성률에 따라 반응 조절
- 캐릭터 말투 유지
- 3-4문장 이내로 응답

[사용자 데이터]
목표 칼로리: ${context.targetCalories}kcal
오늘 섭취: ${context.todayCalories}kcal (달성률 ${ratio}%)
남은 여유: ${remaining}kcal
${weightInfo}
오늘 식단: ${foodList}
연속 기록: ${context.consecutiveDays}일째

[달성률 기준 반응]
- 0-50%: 더 먹어도 됨
- 50-90%: 적당히 잘하고 있음
- 90-110%: 완벽함, 칭찬
- 110-130%: 조금 오버, 주의
- 130%+: 과식, 내일 조절 권유`;
}

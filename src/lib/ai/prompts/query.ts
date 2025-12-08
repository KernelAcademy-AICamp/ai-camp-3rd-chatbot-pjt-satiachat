/**
 * 조회용 프롬프트 (query)
 * 식단 조회 + 체중 질문
 */

import { PERSONAS, type CoachPersona } from './personas';

export interface QueryContext {
  today: string;
  currentWeight: number | null;
  goalWeight: number | null;
}

export function buildQueryPrompt(persona: CoachPersona, context: QueryContext): string {
  const weightInfo = context.currentWeight && context.goalWeight
    ? `현재 체중: ${context.currentWeight}kg (목표: ${context.goalWeight}kg)`
    : context.currentWeight
    ? `현재 체중: ${context.currentWeight}kg`
    : '체중 정보 없음';

  return `${PERSONAS[persona]}

역할: 사용자의 식단/체중 정보를 조회해서 알려주는 코치

규칙:
- 식단 조회 요청 시 get_meals 함수 호출
- 체중 질문은 아래 정보로 직접 답변
- 결과를 캐릭터 말투로 요약
- 2-3문장 이내로 응답

오늘 날짜: ${context.today}
${weightInfo}`;
}

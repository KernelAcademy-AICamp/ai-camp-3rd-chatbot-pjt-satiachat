/**
 * Medications 챗봇용 의도 분류기
 * Dashboard 챗봇과 완전히 분리된 별도 시스템
 */

import OpenAI from 'openai';

export type MedicationIntent = 'medication_info' | 'stats' | 'analysis' | 'chat';

const MEDICATION_CLASSIFIER_PROMPT = `사용자 메시지를 4가지 중 하나로 분류. 영어 소문자 한 단어만 응답.

[분류 기준]
- medication_info: 약물 관련 질문 (효능, 부작용, 용법, 주의사항)
  예: "위고비 부작용", "마운자로 용법", "언제 주사해?", "복용 방법"
- stats: 체중/칼로리/복용 통계 조회
  예: "체중 변화", "이번 주 칼로리", "약 얼마나 먹었어?", "복용률"
- analysis: 약물 효과와 건강 데이터 종합 분석
  예: "약 효과 있어?", "복용 후 변화", "위고비 시작 후 체중", "효과 분석"
- chat: 인사, 일반 대화
  예: "안녕", "고마워", "도움이 됐어"

[핵심 구분 - 중요!]
- "위고비 부작용이 뭐야?" → medication_info (약물 정보)
- "체중 어떻게 됐어?" → stats (통계)
- "약 먹고 효과 있어?" → analysis (종합 분석)
- "안녕하세요" → chat (일반 대화)

예시:
"위고비 효능 알려줘" → medication_info
"마운자로 주사 방법" → medication_info
"부작용이 뭐야?" → medication_info
"이번 주 체중 변화" → stats
"칼로리 얼마나 먹었어?" → stats
"약 복용률은?" → stats
"약 먹고 살 빠졌어?" → analysis
"위고비 시작 후 변화 분석" → analysis
"안녕" → chat
"고마워" → chat`;

/**
 * Medications 전용 의도 분류 함수
 * @param openai OpenAI 클라이언트
 * @param message 사용자 메시지
 * @returns 분류된 의도
 */
export async function classifyMedicationIntent(
  openai: OpenAI,
  message: string
): Promise<MedicationIntent> {
  console.log('[MedicationClassifier] Classifying:', message);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: MEDICATION_CLASSIFIER_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    console.log('[MedicationClassifier] Raw result:', result);

    // 유효한 의도인지 확인
    const validIntents: MedicationIntent[] = ['medication_info', 'stats', 'analysis', 'chat'];
    if (result && validIntents.includes(result as MedicationIntent)) {
      console.log('[MedicationClassifier] Final intent:', result);
      return result as MedicationIntent;
    }

    // medication_info로 fallback (약물 정보가 기본)
    console.warn('[MedicationClassifier] Unexpected result:', result, '→ fallback to medication_info');
    return 'medication_info';
  } catch (error) {
    console.error('[MedicationClassifier] API Error:', error);
    return 'medication_info';
  }
}

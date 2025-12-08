/**
 * 1단계: AI 기반 의도 분류
 * 사용자 메시지를 5가지 카테고리로 분류
 */

import OpenAI from 'openai';

export type ChatIntent = 'log' | 'query' | 'modify' | 'analyze' | 'chat';

const CLASSIFIER_PROMPT = `사용자 메시지를 다음 5가지 중 하나로 분류해.
반드시 영어 소문자로 한 단어만 응답해.

- log: 음식을 먹었다는 기록 (과거형 "먹었어", "먹음")
- query: 식단 조회, 체중 질문 ("뭐 먹었지?", "체중 몇이야?")
- modify: 기록 수정/삭제 ("삭제해줘", "바꿔줘", "대신")
- analyze: 식단 평가, 음식 추천, 조언 요청 ("잘 먹었어?", "뭐 먹을까?", "어때?")
- chat: 인사, 동기부여, 일반 대화 ("안녕", "힘들어", "고마워")

예시:
"치킨 먹었어" → log
"오늘 뭐 먹었지?" → query
"점심 삭제해줘" → modify
"오늘 잘 먹었어?" → analyze
"안녕" → chat
"뭐 먹을까?" → analyze
"힘들어" → chat
"내 체중 알려줘" → query
"피자 대신 샐러드로" → modify`;

/**
 * AI를 사용하여 사용자 메시지 의도 분류
 * @param openai OpenAI 클라이언트
 * @param message 사용자 메시지
 * @returns 분류된 의도
 */
export async function classifyIntent(
  openai: OpenAI,
  message: string
): Promise<ChatIntent> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();

    // 유효한 의도인지 확인
    if (result && ['log', 'query', 'modify', 'analyze', 'chat'].includes(result)) {
      return result as ChatIntent;
    }

    // 기본값
    console.warn('[Classifier] Unexpected result:', result, '→ fallback to chat');
    return 'chat';
  } catch (error) {
    console.error('[Classifier] Error:', error);
    return 'chat';
  }
}

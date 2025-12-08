/**
 * 사용자 메시지의 의도를 분류하는 모듈
 * 키워드 기반으로 빠르게 분류하여 토큰 효율화
 */

export type ChatIntent =
  | 'meal_logging'   // 식단 기록 ("~먹었어")
  | 'meal_query'     // 식단 조회 ("뭐 먹었지?")
  | 'meal_modify'    // 식단 수정/삭제 ("삭제해줘")
  | 'casual_chat';   // 일상 대화/조언

/**
 * 메시지 의도 분류
 * @param message 사용자 메시지
 * @returns 분류된 의도
 */
export function classifyIntent(message: string): ChatIntent {
  const msg = message.toLowerCase();

  // 1. 조회 의도 (가장 먼저 체크 - "뭐 먹었지" 등)
  if (/뭐\s*먹|먹었지|식단.*알려|조회|확인해|뭘\s*먹|얼마나\s*먹|칼로리.*얼마/.test(msg)) {
    return 'meal_query';
  }

  // 2. 삭제/수정 의도 (대체 패턴 포함)
  // "A 대신 B", "A 말고 B", "A 아니고 B" 패턴도 수정 의도로 분류
  const hasModifyKeyword = /삭제|지워|취소|수정|바꿔|변경|없던.*걸로|잘못.*기록/.test(msg);
  const hasReplacementPattern = /대신|말고|아니고/.test(msg);

  if (hasModifyKeyword || hasReplacementPattern) {
    return 'meal_modify';
  }

  // 3. 미래형 표현은 조언 요청 → casual_chat으로 분류
  // "먹을거야", "먹을래", "먹으려고" 등은 아직 먹지 않은 것이므로 기록하지 않음
  const isFutureTense = /먹을거|먹을래|먹으려|먹을까|먹어도|먹어볼/.test(msg);
  if (isFutureTense && !/먹었/.test(msg)) {
    return 'casual_chat'; // 조언 요청으로 처리
  }

  // 4. 기록 의도 (음식 + 과거형 먹었다 표현)
  const hasFoodMention = /먹었|섭취|먹음|먹을게|kcal|칼로리|아침|점심|저녁|간식|야식/.test(msg);
  const hasEatingAction = /먹었|섭취했|마셨|마심|들었/.test(msg);

  // 음식 키워드 (일반적인 음식들)
  const foodKeywords = /밥|국|찌개|고기|치킨|피자|라면|샐러드|김치|계란|빵|커피|우유|과일|사과|바나나|닭|돼지|소고기|떡볶이|족발|삼겹살|햄버거|파스타|초밥|회|볶음밥|비빔밥|냉면|짜장|짬뽕|탕수육|만두|김밥|떡|과자|아이스크림|케이크|주스|콜라|맥주|소주/;

  if (hasFoodMention || (hasEatingAction && foodKeywords.test(msg))) {
    return 'meal_logging';
  }

  // 4. 일상 대화 (위에 해당 안 되면)
  return 'casual_chat';
}

/**
 * 일상 대화 세부 유형 분류 (캐릭터 반응용)
 */
export type CasualChatType =
  | 'greeting'        // 인사
  | 'advice_request'  // 조언 요청
  | 'motivation'      // 동기부여 요청
  | 'complaint'       // 불평/하소연
  | 'weight_query'    // 체중 질문
  | 'general';        // 일반

export function classifyCasualChat(message: string): CasualChatType {
  const msg = message.toLowerCase();

  // 인사
  if (/안녕|하이|헬로|반가|좋은\s*아침|좋은\s*저녁/.test(msg)) {
    return 'greeting';
  }

  // 체중 질문 (새로 추가)
  if (/체중|몸무게|키로|kg|목표.*체중|현재.*체중|얼마나.*빠|몇.*빠졌/.test(msg)) {
    return 'weight_query';
  }

  // 조언 요청
  if (/추천|어떨까|뭐\s*먹을|괜찮|좋을까|어때|알려줘|도움|조언/.test(msg)) {
    return 'advice_request';
  }

  // 동기부여 요청
  if (/힘들|지쳐|포기|못\s*하겠|의욕|동기|응원|격려|힘\s*나/.test(msg)) {
    return 'motivation';
  }

  // 불평/하소연
  if (/짜증|싫|배고파|참기|힘들어|스트레스|먹고\s*싶/.test(msg)) {
    return 'complaint';
  }

  return 'general';
}

"""
Intent classifier - Step 1 of 2-step AI call
Classifies user message into 6 categories
"""
from typing import Literal
from openai import AsyncOpenAI

ChatIntent = Literal["log", "query", "stats", "modify", "analyze", "chat"]

CLASSIFIER_PROMPT = """사용자 메시지를 6가지 중 하나로 분류. 영어 소문자 한 단어만 응답.

[분류 기준]
- log: 음식을 먹었다는 보고 ("~먹었어", "~먹음", "~섭취")
- query: 구체적 식단 조회 ("뭐 먹었지?", "아침에 뭐 먹었어?", "오늘 식단")
- stats: 칼로리/체중 수치 질문 ("칼로리 얼마?", "체중 어때?", "얼마나 먹었어?", "몇 칼로리?")
- modify: 기록 수정/삭제 ("삭제", "지워", "바꿔", "대신", "수정")
- analyze: 식단 평가/추천 요청 ("잘 먹었어?", "뭐 먹을까?", "어때?", "평가해줘")
- chat: 인사, 감정, 일반 대화 ("안녕", "힘들어", "고마워")

[핵심 구분 - 중요!]
- "뭐 먹었어?" → query (음식 목록 조회)
- "얼마나 먹었어?", "칼로리 얼마?" → stats (수치/통계)
- "체중 어때?", "체중 변화" → stats (수치/통계)
- "잘 먹었어?", "평가해줘" → analyze (평가/피드백)

예시:
"치킨 먹었어" → log
"오늘 뭐 먹었지?" → query
"아침에 뭐 먹었어?" → query
"최근 칼로리는?" → stats
"오늘 몇 칼로리야?" → stats
"체중 변화 어때?" → stats
"이번주 얼마나 먹었어?" → stats
"점심 삭제해줘" → modify
"오늘 잘 먹었어?" → analyze
"안녕" → chat"""

VALID_INTENTS = {"log", "query", "stats", "modify", "analyze", "chat"}


async def classify_intent(client: AsyncOpenAI, message: str) -> ChatIntent:
    """
    Classify user message intent using AI

    Args:
        client: OpenAI client
        message: User message

    Returns:
        Classified intent
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": CLASSIFIER_PROMPT},
                {"role": "user", "content": message},
            ],
            max_tokens=10,
            temperature=0,
        )

        result = response.choices[0].message.content
        if result:
            result = result.strip().lower()
            if result in VALID_INTENTS:
                return result  # type: ignore

        return "chat"

    except Exception as e:
        print(f"[Classifier] Error: {e}")
        return "chat"

"""
OpenAI Function Calling tool definitions
"""
from datetime import date
from typing import Optional
import json

from ai.prompts.classifier import ChatIntent


def get_today_local() -> str:
    """Get today's date in YYYY-MM-DD format"""
    return date.today().isoformat()


# Tool definitions
LOG_MEAL_TOOL = {
    "type": "function",
    "function": {
        "name": "log_meal",
        "description": """사용자가 먹은 음식을 기록합니다.
"~먹었어", "~섭취했어" 등 음식 섭취 언급 시 호출하세요.

칼로리 추정: 밥300, 국/찌개100-200, 치킨1/4마리450, 라면500""",
        "parameters": {
            "type": "object",
            "properties": {
                "meal_type": {
                    "type": "string",
                    "enum": ["breakfast", "lunch", "dinner", "snack"],
                    "description": "식사 종류 (시간 기준: 아침5-10시, 점심10-15시, 저녁15-21시, 그 외 간식)",
                },
                "foods": {
                    "type": "array",
                    "description": "먹은 음식들",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "음식 이름과 양"},
                            "quantity": {"type": "number", "description": "인분 수 (기본값 1)"},
                            "calories": {"type": "number", "description": "총 칼로리 (kcal)"},
                            "protein": {"type": "number", "description": "단백질 (g)"},
                            "carbs": {"type": "number", "description": "탄수화물 (g)"},
                            "fat": {"type": "number", "description": "지방 (g)"},
                        },
                        "required": ["name", "calories", "protein", "carbs", "fat"],
                    },
                },
                "date": {"type": "string", "description": "YYYY-MM-DD 형식의 날짜."},
            },
            "required": ["meal_type", "foods"],
        },
    },
}

GET_MEALS_TOOL = {
    "type": "function",
    "function": {
        "name": "get_meals",
        "description": """사용자의 식단 기록을 조회합니다.
사용자가 "오늘 뭐 먹었지?", "아침에 뭐 먹었어?", "어제 식단 알려줘" 등 식단 조회를 요청하면 이 함수를 호출하세요.""",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "YYYY-MM-DD 형식의 날짜. 기본값은 오늘.",
                },
                "meal_type": {
                    "type": "string",
                    "enum": ["breakfast", "lunch", "dinner", "snack", "all"],
                    "description": '조회할 식사 종류. 기본값은 "all".',
                },
            },
            "required": [],
        },
    },
}

DELETE_MEAL_TOOL = {
    "type": "function",
    "function": {
        "name": "delete_meal",
        "description": """사용자의 식단 기록을 삭제합니다.

예시:
- "점심 피자 지워줘" → meal_type: "lunch", food_name: "피자"
- "아침 취소해줘" → meal_type: "breakfast" (전체 삭제)
- "어제 저녁 삭제" → date: 어제날짜, meal_type: "dinner"

중요: 날짜를 언급하지 않으면 반드시 오늘 날짜를 사용하세요.""",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": 'YYYY-MM-DD 형식. 미지정시 오늘 날짜 사용. "어제"는 오늘-1일로 계산.',
                },
                "meal_type": {
                    "type": "string",
                    "enum": ["breakfast", "lunch", "dinner", "snack"],
                    "description": "삭제할 식사 종류.",
                },
                "food_name": {
                    "type": "string",
                    "description": "삭제할 특정 음식 이름. 미지정시 해당 끼니 전체 삭제.",
                },
            },
            "required": ["meal_type"],
        },
    },
}

UPDATE_MEAL_TOOL = {
    "type": "function",
    "function": {
        "name": "update_meal",
        "description": """사용자의 식단 기록을 수정합니다.

패턴 인식 (중요!):
- "A 대신 B 먹었어" → old_food_name: "A", new_food.name: "B"
- "A 말고 B였어" → old_food_name: "A", new_food.name: "B"
- "A를 B로 바꿔줘" → old_food_name: "A", new_food.name: "B"

중요: 날짜를 언급하지 않으면 반드시 오늘 날짜를 사용하세요.
칼로리 추정: 밥300, 치킨450, 라면500, 샐러드200, 닭가슴살150, 계란후라이180""",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": 'YYYY-MM-DD 형식. 미지정시 오늘 날짜 사용. "어제"는 오늘-1일로 계산.',
                },
                "meal_type": {
                    "type": "string",
                    "enum": ["breakfast", "lunch", "dinner", "snack"],
                    "description": '수정할 식사 종류. "점심"=lunch, "아침"=breakfast, "저녁"=dinner',
                },
                "old_food_name": {
                    "type": "string",
                    "description": '수정 대상 기존 음식 이름. "A 대신 B"에서 A에 해당.',
                },
                "new_food": {
                    "type": "object",
                    "description": '새로운 음식 정보. "A 대신 B"에서 B에 해당. 영양정보 추정 필수.',
                    "properties": {
                        "name": {"type": "string"},
                        "calories": {"type": "number"},
                        "protein": {"type": "number"},
                        "carbs": {"type": "number"},
                        "fat": {"type": "number"},
                    },
                    "required": ["name", "calories", "protein", "carbs", "fat"],
                },
            },
            "required": ["meal_type", "old_food_name", "new_food"],
        },
    },
}


def get_tools_for_intent(intent: ChatIntent) -> list[dict]:
    """Get tools for a given intent"""
    if intent == "log":
        return [LOG_MEAL_TOOL]
    elif intent == "query":
        return [GET_MEALS_TOOL]
    elif intent == "modify":
        return [DELETE_MEAL_TOOL, UPDATE_MEAL_TOOL, LOG_MEAL_TOOL]
    else:
        return []


# Argument parsing functions
def parse_log_meal_args(args_string: str) -> Optional[dict]:
    """Parse log_meal function arguments"""
    try:
        args = json.loads(args_string)

        if not args.get("meal_type") or not args.get("foods"):
            return None

        if not args.get("date"):
            args["date"] = get_today_local()

        # Set defaults for each food
        args["foods"] = [
            {
                "name": food.get("name", ""),
                "quantity": food.get("quantity", 1),
                "calories": food.get("calories", 0),
                "protein": food.get("protein", 0),
                "carbs": food.get("carbs", 0),
                "fat": food.get("fat", 0),
            }
            for food in args["foods"]
        ]

        return args
    except Exception:
        return None


def parse_get_meals_args(args_string: str) -> dict:
    """Parse get_meals function arguments"""
    try:
        args = json.loads(args_string)
        return {
            "date": args.get("date", get_today_local()),
            "meal_type": args.get("meal_type", "all"),
        }
    except Exception:
        return {"date": get_today_local(), "meal_type": "all"}


def parse_delete_meal_args(args_string: str) -> Optional[dict]:
    """Parse delete_meal function arguments"""
    try:
        args = json.loads(args_string)
        if not args.get("meal_type"):
            return None
        return {
            "date": args.get("date", get_today_local()),
            "meal_type": args["meal_type"],
            "food_name": args.get("food_name"),
        }
    except Exception:
        return None


def parse_update_meal_args(args_string: str) -> Optional[dict]:
    """Parse update_meal function arguments"""
    try:
        args = json.loads(args_string)
        if not args.get("meal_type") or not args.get("old_food_name") or not args.get("new_food"):
            return None
        return {
            "date": args.get("date", get_today_local()),
            "meal_type": args["meal_type"],
            "old_food_name": args["old_food_name"],
            "new_food": {
                "name": args["new_food"].get("name", ""),
                "calories": args["new_food"].get("calories", 0),
                "protein": args["new_food"].get("protein", 0),
                "carbs": args["new_food"].get("carbs", 0),
                "fat": args["new_food"].get("fat", 0),
            },
        }
    except Exception:
        return None

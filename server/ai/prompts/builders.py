"""
Prompt builders for each intent type
"""
from typing import Optional
from dataclasses import dataclass
from .personas import PERSONAS, CoachPersona


@dataclass
class WeightRecord:
    date: str
    weight: float


@dataclass
class DailyCalorieRecord:
    date: str
    calories: int


@dataclass
class UserContext:
    """User context data for prompts"""
    today: str
    today_calories: int = 0
    target_calories: int = 2000
    consecutive_days: int = 0
    current_weight: Optional[float] = None
    goal_weight: Optional[float] = None
    today_foods: list[str] = None
    recent_weights: list[WeightRecord] = None
    weight_trend: str = "unknown"  # up, down, stable, unknown
    weekly_avg_calories: int = 0
    recent_daily_calories: list[DailyCalorieRecord] = None

    def __post_init__(self):
        if self.today_foods is None:
            self.today_foods = []
        if self.recent_weights is None:
            self.recent_weights = []
        if self.recent_daily_calories is None:
            self.recent_daily_calories = []


def build_log_prompt(persona: CoachPersona, context: UserContext) -> str:
    """Build prompt for meal logging (log intent)"""
    remaining = context.target_calories - context.today_calories
    ratio = round((context.today_calories / context.target_calories) * 100) if context.target_calories > 0 else 0

    ratio_comment = ""
    if ratio < 90:
        ratio_comment = f"- {ratio}% 미만: 아직 여유 있다고"
    if ratio >= 90:
        ratio_comment = "- 지금 거의 다 채움!"
    if ratio > 100:
        ratio_comment = "- 오버했다! 주의!"

    return f"""{PERSONAS[persona]}

[임무] 사용자가 먹은 음식을 기록하고 캐릭터답게 반응해!

[절대 금지]
- "기록 완료", "추가 완료" 같은 로봇 말투 금지!
- 그냥 칼로리만 말하는 것 금지!
- 반드시 위 예시처럼 캐릭터 말투로 답변해!

[해야 할 것]
- log_meal 함수 호출
- 음식에 대한 재치있는 한마디 (맛있겠다, 건강하다, 좀 많다 등)
- 칼로리 상황에 맞는 코멘트

[중요! 음식 구분 규칙]
- 콤마(,)나 "이랑/하고/랑"으로 구분된 경우에만 여러 음식!
- 구분자 없이 붙어있으면 무조건 1개 음식으로 기록!
- "달걀 샐러드" → 1개 (구분자 없음)
- "비빔밥, 된장찌개" → 2개 (콤마로 구분)
- "치킨이랑 맥주" → 2개 (이랑으로 구분)

[칼로리 추정]
밥300, 치킨450, 라면500, 샐러드200, 떡볶이400, 피자280, 삼겹살550

[현재 상황]
- 오늘: {context.today}
- 섭취: {context.today_calories}kcal / 목표: {context.target_calories}kcal ({ratio}%)
- 남은 여유: {remaining}kcal

[상황별 반응]
{ratio_comment}"""


def build_query_prompt(persona: CoachPersona, context: UserContext) -> str:
    """Build prompt for meal query (query intent)"""
    # Weight info
    if context.current_weight and context.goal_weight:
        weight_info = f"현재 체중: {context.current_weight}kg (목표: {context.goal_weight}kg)"
    elif context.current_weight:
        weight_info = f"현재 체중: {context.current_weight}kg"
    else:
        weight_info = "체중 정보 없음"

    # Weight change
    weight_change_info = ""
    if len(context.recent_weights) >= 2:
        first = context.recent_weights[0]
        last = context.recent_weights[-1]
        diff = last.weight - first.weight
        sign = "+" if diff > 0 else ""
        weight_change_info = f"최근 {len(context.recent_weights)}일 체중 변화: {first.weight}kg → {last.weight}kg ({sign}{diff:.1f}kg)"
    elif len(context.recent_weights) == 1:
        w = context.recent_weights[0]
        weight_change_info = f"최근 기록: {w.date} - {w.weight}kg"
    else:
        weight_change_info = "최근 7일 체중 기록 없음"

    # Trend
    trend_text = {
        "up": "📈 증가 추세",
        "down": "📉 감소 추세 (좋아요!)",
        "stable": "➡️ 유지 중",
        "unknown": "❓ 데이터 부족",
    }.get(context.weight_trend, "❓ 데이터 부족")

    # Calorie info
    today_percent = round((context.today_calories / context.target_calories) * 100) if context.target_calories > 0 else 0
    remaining = max(0, context.target_calories - context.today_calories)
    calorie_info = f"오늘: {context.today_calories}kcal / 목표: {context.target_calories}kcal ({today_percent}%) | 남은 여유: {remaining}kcal"

    # Weekly calorie info
    if context.recent_daily_calories:
        daily_list = ", ".join([f"{d.date[5:]}: {d.calories}kcal" for d in context.recent_daily_calories])
        weekly_calorie_info = f"최근 {len(context.recent_daily_calories)}일 칼로리: {daily_list}"
    else:
        weekly_calorie_info = "최근 7일 칼로리 기록 없음"

    avg_diff = context.weekly_avg_calories - context.target_calories
    if avg_diff > 0:
        avg_diff_text = f"목표 대비 +{avg_diff}kcal 초과"
    elif avg_diff < 0:
        avg_diff_text = f"목표 대비 {avg_diff}kcal 절약"
    else:
        avg_diff_text = "목표 달성"

    return f"""{PERSONAS[persona]}

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

오늘 날짜: {context.today}

[체중 정보]
{weight_info}
{weight_change_info}
추세: {trend_text}

[칼로리 정보]
{calorie_info}
{weekly_calorie_info}
주간 평균: {context.weekly_avg_calories}kcal/일 ({avg_diff_text})"""


def build_stats_prompt(persona: CoachPersona, context: UserContext) -> str:
    """Build prompt for stats query (stats intent)"""
    # Weight info
    if context.current_weight and context.goal_weight:
        diff = context.goal_weight - context.current_weight
        sign = "+" if diff > 0 else ""
        weight_info = f"현재: {context.current_weight}kg → 목표: {context.goal_weight}kg ({sign}{diff:.1f}kg)"
    elif context.current_weight:
        weight_info = f"현재: {context.current_weight}kg"
    else:
        weight_info = "체중 기록 없음"

    # Weight change
    weight_change_info = ""
    if len(context.recent_weights) >= 2:
        first = context.recent_weights[0]
        last = context.recent_weights[-1]
        diff = last.weight - first.weight
        sign = "+" if diff > 0 else ""
        weight_change_info = f"최근 {len(context.recent_weights)}일: {first.weight}kg → {last.weight}kg ({sign}{diff:.1f}kg)"
    elif len(context.recent_weights) == 1:
        w = context.recent_weights[0]
        weight_change_info = f"기록: {w.date} - {w.weight}kg"
    else:
        weight_change_info = "최근 7일 체중 기록 없음"

    trend_emoji = {
        "up": "📈 증가",
        "down": "📉 감소",
        "stable": "➡️ 유지",
        "unknown": "❓ 데이터 부족",
    }.get(context.weight_trend, "❓ 데이터 부족")

    # Calorie info
    today_percent = round((context.today_calories / context.target_calories) * 100) if context.target_calories > 0 else 0
    remaining = max(0, context.target_calories - context.today_calories)

    # Daily calorie list
    if context.recent_daily_calories:
        daily_calorie_list = "\n  ".join([f"{d.date[5:]}: {d.calories}kcal" for d in context.recent_daily_calories])
    else:
        daily_calorie_list = "기록 없음"

    avg_diff = context.weekly_avg_calories - context.target_calories
    if avg_diff > 0:
        avg_status = f"+{avg_diff}kcal 초과"
    elif avg_diff < 0:
        avg_status = f"{avg_diff}kcal 절약"
    else:
        avg_status = "목표 달성"

    return f"""{PERSONAS[persona]}

[임무]
사용자가 칼로리나 체중 수치를 물어봤어. 아래 데이터를 기반으로 캐릭터답게 답변해!

[중요]
- 함수 호출 없이 아래 데이터만으로 답변해
- 질문에 맞는 정보를 중심으로 답변 (칼로리 질문 → 칼로리 중심, 체중 질문 → 체중 중심)
- 수치를 명확히 말해주고, 짧은 코멘트 추가
- 2-3문장으로 간결하게

오늘: {context.today}

[체중 데이터]
{weight_info}
{weight_change_info}
추세: {trend_emoji}

[칼로리 데이터]
오늘: {context.today_calories}kcal / 목표: {context.target_calories}kcal ({today_percent}%)
남은 여유: {remaining}kcal
주간 평균: {context.weekly_avg_calories}kcal/일 ({avg_status})

최근 일별 칼로리:
  {daily_calorie_list}"""


def build_modify_prompt(persona: CoachPersona, context: UserContext) -> str:
    """Build prompt for modify/delete (modify intent)"""
    return f"""{PERSONAS[persona]}

[임무] 사용자의 식단 기록을 수정/삭제하고 캐릭터답게 반응해!

[절대 금지]
- "수정 완료", "삭제 완료", "변경 완료" 같은 로봇 말투 금지!
- 반드시 위 예시처럼 캐릭터 말투로 답변해!

[함수 호출 규칙]
- "A 대신 B", "A 말고 B" → update_meal
- "삭제", "지워", "취소" → delete_meal
- "지우고 ~먹었어" → delete_meal + log_meal 둘 다!

[해야 할 것]
- 수정/삭제 후 재치있는 한마디
- 실수해도 괜찮다는 따뜻한 반응
- 더 건강한 선택이면 칭찬

오늘 날짜: {context.today}

[칼로리 추정]
밥300, 치킨450, 라면500, 샐러드200, 피자280, 삼겹살550"""


def build_analyze_prompt(persona: CoachPersona, context: UserContext) -> str:
    """Build prompt for analysis/feedback (analyze intent)"""
    ratio = round((context.today_calories / context.target_calories) * 100) if context.target_calories > 0 else 0
    remaining = context.target_calories - context.today_calories

    # Weight info
    weight_info = ""
    if context.current_weight and context.goal_weight:
        weight_info = f"체중: {context.current_weight}kg → 목표 {context.goal_weight}kg"

    # Weight change
    weight_change_info = ""
    if len(context.recent_weights) >= 2:
        first = context.recent_weights[0]
        last = context.recent_weights[-1]
        diff = last.weight - first.weight
        sign = "+" if diff > 0 else ""
        weight_change_info = f"최근 체중 변화: {first.weight}kg → {last.weight}kg ({sign}{diff:.1f}kg)"

    # Trend
    trend_text = {
        "up": "📈 증가 추세 (주의!)",
        "down": "📉 감소 추세 (잘하고 있어!)",
        "stable": "➡️ 유지 중",
        "unknown": "",
    }.get(context.weight_trend, "")

    # Weekly calorie
    weekly_cal_info = ""
    weekly_vs_target = ""
    if context.weekly_avg_calories > 0:
        weekly_cal_info = f"주간 평균 칼로리: {context.weekly_avg_calories}kcal/일"
        diff = context.weekly_avg_calories - context.target_calories
        if diff > 0:
            weekly_vs_target = f"(목표 대비 +{diff}kcal 초과)"
        else:
            weekly_vs_target = f"(목표 대비 {context.target_calories - context.weekly_avg_calories}kcal 여유)"

    food_list = ", ".join(context.today_foods) if context.today_foods else "아직 기록 없음"

    return f"""{PERSONAS[persona]}

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
- 목표: {context.target_calories}kcal
- 섭취: {context.today_calories}kcal ({ratio}%)
- 남은 여유: {remaining}kcal
- 오늘 식단: {food_list}
- 연속 기록: {context.consecutive_days}일째

[주간 트렌드]
{f"- {weight_info}" if weight_info else ""}
{f"- {weight_change_info}" if weight_change_info else ""}
{f"- {trend_text}" if trend_text else ""}
{f"- {weekly_cal_info} {weekly_vs_target}" if weekly_cal_info else ""}

[달성률별 반응]
- 0-50%: 아직 많이 먹어도 돼!
- 50-90%: 잘하고 있어!
- 90-110%: 완벽해! 칭찬!
- 110%+: 오버했어! 내일 조절하자!

[체중 추세별 반응]
- 감소 추세: 칭찬! 이대로 유지!
- 증가 추세: 살짝 주의, 식단 조절 권유
- 유지 중: 안정적! 꾸준함 칭찬"""


def build_chat_prompt(persona: CoachPersona) -> str:
    """Build prompt for casual chat (chat intent)"""
    return f"""{PERSONAS[persona]}

[임무] 친근한 대화 상대이자 다이어트 응원단!

[절대 금지]
- 딱딱한 말투 금지!
- 반드시 위 예시처럼 캐릭터 말투로 답변해!

[해야 할 것]
- 인사 → 반갑게 인사 + 오늘 응원
- 힘들다 → 공감 + 격려
- 포기하고 싶다 → 노력 인정 + 응원
- 고마워 → 따뜻하게 + 계속 함께하자
- 1-2문장으로 짧게!
- 함수 호출 하지 마!"""

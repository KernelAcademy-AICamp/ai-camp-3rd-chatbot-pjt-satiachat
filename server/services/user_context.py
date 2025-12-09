"""
User context service - fetches user data for AI prompts
"""
from datetime import date, timedelta
from typing import Optional
from supabase import Client

from ai.prompts.builders import UserContext, WeightRecord, DailyCalorieRecord


def get_today() -> str:
    """Get today's date in YYYY-MM-DD format"""
    return date.today().isoformat()


def format_date(d: date) -> str:
    """Format date to YYYY-MM-DD"""
    return d.isoformat()


async def fetch_user_context(db: Client, user_id: str) -> UserContext:
    """
    Fetch user context data for AI prompts

    Args:
        db: Supabase client
        user_id: User ID

    Returns:
        UserContext with all relevant user data
    """
    today = get_today()
    seven_days_ago = date.today() - timedelta(days=6)
    week_ago_str = format_date(seven_days_ago)

    # 1. Today's meals
    today_meals_result = db.table("meals").select(
        "total_calories, meal_type, meal_items (name)"
    ).eq("user_id", user_id).eq("date", today).execute()

    today_meals = today_meals_result.data or []
    today_calories = sum(meal.get("total_calories", 0) or 0 for meal in today_meals)

    # Today's foods list
    meal_type_kr = {
        "breakfast": "아침",
        "lunch": "점심",
        "dinner": "저녁",
        "snack": "간식",
    }
    today_foods = []
    for meal in today_meals:
        meal_items = meal.get("meal_items", []) or []
        for item in meal_items:
            today_foods.append(f"{meal_type_kr.get(meal.get('meal_type'), '')}:{item.get('name', '')}")

    # 2. Profile
    profile_result = db.table("user_profiles").select(
        "target_calories, current_weight_kg, goal_weight_kg"
    ).eq("user_id", user_id).maybe_single().execute()

    profile = profile_result.data
    target_calories = profile.get("target_calories", 2000) if profile else 2000
    goal_weight = profile.get("goal_weight_kg") if profile else None

    # 3. Recent 7 days weight records
    weight_logs_result = db.table("progress_logs").select(
        "date, weight_kg"
    ).eq("user_id", user_id).gte("date", week_ago_str).lte("date", today).order(
        "date", desc=False
    ).execute()

    weight_logs = weight_logs_result.data or []
    recent_weights = [
        WeightRecord(date=log["date"], weight=log["weight_kg"])
        for log in weight_logs
    ]

    # 4. Current weight (latest from progress_logs, or fallback to profile)
    current_weight: Optional[float] = None
    if recent_weights:
        current_weight = recent_weights[-1].weight
    elif profile and profile.get("current_weight_kg"):
        current_weight = profile["current_weight_kg"]

    # 5. Weight trend
    weight_trend = "unknown"
    if len(recent_weights) >= 2:
        first_weight = recent_weights[0].weight
        last_weight = recent_weights[-1].weight
        diff = last_weight - first_weight
        if diff > 0.3:
            weight_trend = "up"
        elif diff < -0.3:
            weight_trend = "down"
        else:
            weight_trend = "stable"

    # 6. Weekly average calories + daily calories
    weekly_meals_result = db.table("meals").select(
        "date, total_calories"
    ).eq("user_id", user_id).gte("date", week_ago_str).lte("date", today).execute()

    weekly_meals = weekly_meals_result.data or []
    weekly_avg_calories = 0
    recent_daily_calories: list[DailyCalorieRecord] = []

    if weekly_meals:
        daily_calories: dict[str, int] = {}
        for meal in weekly_meals:
            meal_date = meal.get("date")
            if meal_date not in daily_calories:
                daily_calories[meal_date] = 0
            daily_calories[meal_date] += meal.get("total_calories", 0) or 0

        # Daily calorie records (sorted by date)
        for d, cal in sorted(daily_calories.items()):
            recent_daily_calories.append(DailyCalorieRecord(date=d, calories=cal))

        days = len(daily_calories)
        total_cal = sum(daily_calories.values())
        weekly_avg_calories = round(total_cal / days) if days > 0 else 0

    # 7. Consecutive days (check last 7 days)
    consecutive_days = 0
    check_date = date.today() - timedelta(days=1)

    for _ in range(7):
        date_str = format_date(check_date)
        meals_check = db.table("meals").select("id").eq(
            "user_id", user_id
        ).eq("date", date_str).limit(1).execute()

        if meals_check.data:
            consecutive_days += 1
            check_date -= timedelta(days=1)
        else:
            break

    return UserContext(
        today=today,
        today_calories=today_calories,
        target_calories=target_calories,
        consecutive_days=consecutive_days,
        current_weight=current_weight,
        goal_weight=goal_weight,
        today_foods=today_foods,
        recent_weights=recent_weights,
        weight_trend=weight_trend,
        weekly_avg_calories=weekly_avg_calories,
        recent_daily_calories=recent_daily_calories,
    )

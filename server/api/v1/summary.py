"""
Data summary/aggregation API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from api.deps import get_current_user, TokenData
from core.database import get_supabase

router = APIRouter(prefix="/summary", tags=["Data Summary"])


class TodaySummary(BaseModel):
    """Today's summary data"""
    calories_consumed: int
    calories_target: int
    calories_remaining: int
    protein_g: float
    carbs_g: float
    fat_g: float
    meals_logged: int
    date: str


class DailyCalorie(BaseModel):
    """Daily calorie data"""
    date: str
    calories: int
    meals_count: int


class WeeklySummary(BaseModel):
    """Weekly summary data"""
    daily_calories: list[DailyCalorie]
    average_calories: float
    total_calories: int
    weight_start: Optional[float]
    weight_end: Optional[float]
    weight_change: Optional[float]
    medication_adherence: float
    start_date: str
    end_date: str


class MedicationAdherence(BaseModel):
    """Medication adherence data"""
    days: int
    total_scheduled: int
    total_taken: int
    total_skipped: int
    adherence_rate: float
    by_medication: list[dict]


@router.get("/today", response_model=TodaySummary)
async def get_today_summary(
    user: TokenData = Depends(get_current_user)
):
    """
    Get today's summary

    - Calories: consumed/target/remaining
    - Nutrients: protein/carbs/fat
    - Meals logged count
    """
    try:
        db = get_supabase()
        today = date.today().isoformat()

        # Get user profile for target calories
        profile_result = db.table("user_profiles").select(
            "target_calories"
        ).eq("user_id", user.user_id).maybe_single().execute()

        target_calories = 1800  # default
        if profile_result.data:
            target_calories = profile_result.data.get("target_calories") or 1800

        # Get today's meals with items
        meals_result = db.table("meals").select(
            "id, total_calories, meal_items(calories, protein_g, carbs_g, fat_g)"
        ).eq("user_id", user.user_id).eq("date", today).execute()

        meals = meals_result.data or []

        # Calculate totals
        calories_consumed = 0
        protein_g = 0.0
        carbs_g = 0.0
        fat_g = 0.0

        for meal in meals:
            calories_consumed += meal.get("total_calories") or 0
            for item in (meal.get("meal_items") or []):
                protein_g += item.get("protein_g") or 0
                carbs_g += item.get("carbs_g") or 0
                fat_g += item.get("fat_g") or 0

        return TodaySummary(
            calories_consumed=calories_consumed,
            calories_target=target_calories,
            calories_remaining=max(0, target_calories - calories_consumed),
            protein_g=round(protein_g, 1),
            carbs_g=round(carbs_g, 1),
            fat_g=round(fat_g, 1),
            meals_logged=len(meals),
            date=today,
        )

    except Exception as e:
        print(f"[Summary API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly", response_model=WeeklySummary)
async def get_weekly_summary(
    user: TokenData = Depends(get_current_user)
):
    """
    Get weekly summary (last 7 days)

    - Daily calorie trend
    - Average calories
    - Weight change
    - Medication adherence rate
    """
    try:
        db = get_supabase()
        today = date.today()
        week_ago = today - timedelta(days=6)

        today_str = today.isoformat()
        week_ago_str = week_ago.isoformat()

        # Get meals for the week
        meals_result = db.table("meals").select(
            "date, total_calories"
        ).eq("user_id", user.user_id).gte(
            "date", week_ago_str
        ).lte("date", today_str).execute()

        meals = meals_result.data or []

        # Group by date
        daily_data = {}
        for d in range(7):
            current_date = (week_ago + timedelta(days=d)).isoformat()
            daily_data[current_date] = {"calories": 0, "meals_count": 0}

        for meal in meals:
            meal_date = meal.get("date")
            if meal_date in daily_data:
                daily_data[meal_date]["calories"] += meal.get("total_calories") or 0
                daily_data[meal_date]["meals_count"] += 1

        daily_calories = [
            DailyCalorie(
                date=d,
                calories=daily_data[d]["calories"],
                meals_count=daily_data[d]["meals_count"],
            )
            for d in sorted(daily_data.keys())
        ]

        total_calories = sum(dc.calories for dc in daily_calories)
        days_with_data = sum(1 for dc in daily_calories if dc.calories > 0)
        average_calories = total_calories / days_with_data if days_with_data > 0 else 0

        # Get weight data
        weight_result = db.table("progress_logs").select(
            "date, weight_kg"
        ).eq("user_id", user.user_id).gte(
            "date", week_ago_str
        ).lte("date", today_str).order("date", desc=False).execute()

        weights = weight_result.data or []
        weight_start = weights[0].get("weight_kg") if weights else None
        weight_end = weights[-1].get("weight_kg") if weights else None
        weight_change = None
        if weight_start and weight_end:
            weight_change = round(weight_end - weight_start, 1)

        # Get medication adherence
        adherence = await calculate_medication_adherence(db, user.user_id, 7)

        return WeeklySummary(
            daily_calories=daily_calories,
            average_calories=round(average_calories, 1),
            total_calories=total_calories,
            weight_start=weight_start,
            weight_end=weight_end,
            weight_change=weight_change,
            medication_adherence=adherence["adherence_rate"],
            start_date=week_ago_str,
            end_date=today_str,
        )

    except Exception as e:
        print(f"[Summary API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def calculate_medication_adherence(
    db, user_id: str, days: int
) -> dict:
    """Calculate medication adherence for given days"""
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Get active medications
    meds_result = db.table("medications").select(
        "id, name, frequency"
    ).eq("user_id", user_id).eq("is_active", True).execute()

    medications = meds_result.data or []

    if not medications:
        return {
            "total_scheduled": 0,
            "total_taken": 0,
            "total_skipped": 0,
            "adherence_rate": 100.0,
            "by_medication": [],
        }

    # Calculate expected doses per medication
    by_medication = []
    total_scheduled = 0
    total_taken = 0
    total_skipped = 0

    for med in medications:
        med_id = med.get("id")
        med_name = med.get("name")
        frequency = med.get("frequency", "once_daily")

        # Calculate expected doses
        doses_per_day = 1
        if frequency == "twice_daily":
            doses_per_day = 2
        elif frequency == "three_times_daily":
            doses_per_day = 3
        elif frequency == "weekly":
            doses_per_day = 1 / 7

        expected_doses = int(doses_per_day * days)

        # Get actual logs
        logs_result = db.table("medication_logs").select(
            "status"
        ).eq("medication_id", med_id).gte(
            "taken_at", start_date.isoformat()
        ).execute()

        logs = logs_result.data or []
        taken = sum(1 for log in logs if log.get("status") == "taken")
        skipped = sum(1 for log in logs if log.get("status") == "skipped")

        med_adherence = (taken / expected_doses * 100) if expected_doses > 0 else 100

        by_medication.append({
            "medication_id": med_id,
            "name": med_name,
            "expected_doses": expected_doses,
            "taken": taken,
            "skipped": skipped,
            "adherence_rate": round(med_adherence, 1),
        })

        total_scheduled += expected_doses
        total_taken += taken
        total_skipped += skipped

    overall_adherence = (total_taken / total_scheduled * 100) if total_scheduled > 0 else 100

    return {
        "total_scheduled": total_scheduled,
        "total_taken": total_taken,
        "total_skipped": total_skipped,
        "adherence_rate": round(overall_adherence, 1),
        "by_medication": by_medication,
    }


@router.get("/medication-adherence", response_model=MedicationAdherence)
async def get_medication_adherence(
    days: int = 7,
    user: TokenData = Depends(get_current_user)
):
    """
    Get medication adherence rate

    - Scheduled vs actual doses
    - Adherence percentage per medication
    """
    try:
        db = get_supabase()
        result = await calculate_medication_adherence(db, user.user_id, days)

        return MedicationAdherence(
            days=days,
            total_scheduled=result["total_scheduled"],
            total_taken=result["total_taken"],
            total_skipped=result["total_skipped"],
            adherence_rate=result["adherence_rate"],
            by_medication=result["by_medication"],
        )

    except Exception as e:
        print(f"[Summary API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class MonthlyReport(BaseModel):
    """Monthly report data"""
    year: int
    month: int
    total_days: int
    days_logged: int
    total_calories: int
    average_daily_calories: float
    weight_start: Optional[float]
    weight_end: Optional[float]
    weight_change: Optional[float]
    medication_adherence: float
    weekly_breakdown: list[dict]


@router.get("/monthly", response_model=MonthlyReport)
async def get_monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user: TokenData = Depends(get_current_user)
):
    """
    Get monthly report

    - Monthly calorie trends
    - Weight progress
    - Medication adherence
    - Weekly breakdown
    """
    try:
        db = get_supabase()
        today = date.today()

        # Default to current month if not specified
        if year is None:
            year = today.year
        if month is None:
            month = today.month

        # Calculate month boundaries
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)

        # Don't go beyond today
        if last_day > today:
            last_day = today

        first_day_str = first_day.isoformat()
        last_day_str = last_day.isoformat()
        total_days = (last_day - first_day).days + 1

        # Get meals for the month
        meals_result = db.table("meals").select(
            "date, total_calories"
        ).eq("user_id", user.user_id).gte(
            "date", first_day_str
        ).lte("date", last_day_str).execute()

        meals = meals_result.data or []

        # Calculate statistics
        dates_with_meals = set()
        total_calories = 0
        daily_calories = {}

        for meal in meals:
            meal_date = meal.get("date")
            dates_with_meals.add(meal_date)
            cal = meal.get("total_calories") or 0
            total_calories += cal
            daily_calories[meal_date] = daily_calories.get(meal_date, 0) + cal

        days_logged = len(dates_with_meals)
        average_daily_calories = total_calories / days_logged if days_logged > 0 else 0

        # Get weight data
        weight_result = db.table("progress_logs").select(
            "date, weight_kg"
        ).eq("user_id", user.user_id).gte(
            "date", first_day_str
        ).lte("date", last_day_str).order("date", desc=False).execute()

        weights = weight_result.data or []
        weight_start = weights[0].get("weight_kg") if weights else None
        weight_end = weights[-1].get("weight_kg") if weights else None
        weight_change = None
        if weight_start and weight_end:
            weight_change = round(weight_end - weight_start, 1)

        # Get medication adherence
        adherence = await calculate_medication_adherence(db, user.user_id, total_days)

        # Weekly breakdown
        weekly_breakdown = []
        current_week_start = first_day

        while current_week_start <= last_day:
            week_end = min(current_week_start + timedelta(days=6), last_day)
            week_calories = sum(
                daily_calories.get(
                    (current_week_start + timedelta(days=d)).isoformat(), 0
                )
                for d in range((week_end - current_week_start).days + 1)
            )
            week_days = (week_end - current_week_start).days + 1
            week_logged = sum(
                1 for d in range(week_days)
                if (current_week_start + timedelta(days=d)).isoformat() in daily_calories
            )

            weekly_breakdown.append({
                "week_start": current_week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "total_calories": week_calories,
                "days_logged": week_logged,
                "average_daily": round(week_calories / week_logged, 1) if week_logged > 0 else 0,
            })

            current_week_start = week_end + timedelta(days=1)

        return MonthlyReport(
            year=year,
            month=month,
            total_days=total_days,
            days_logged=days_logged,
            total_calories=total_calories,
            average_daily_calories=round(average_daily_calories, 1),
            weight_start=weight_start,
            weight_end=weight_end,
            weight_change=weight_change,
            medication_adherence=adherence["adherence_rate"],
            weekly_breakdown=weekly_breakdown,
        )

    except Exception as e:
        print(f"[Summary API] Monthly report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

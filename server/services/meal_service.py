"""
Meal service - CRUD operations for meals
"""
from typing import Optional, Literal
from datetime import date, timedelta
from supabase import Client

MealType = Literal["breakfast", "lunch", "dinner", "snack"]

MEAL_TYPE_LABELS = {
    "breakfast": "아침",
    "lunch": "점심",
    "dinner": "저녁",
    "snack": "간식",
}


def get_today() -> str:
    return date.today().isoformat()


def infer_meal_type() -> MealType:
    """Infer meal type from current time"""
    from datetime import datetime
    hour = datetime.now().hour

    if 5 <= hour < 10:
        return "breakfast"
    elif 10 <= hour < 15:
        return "lunch"
    elif 15 <= hour < 21:
        return "dinner"
    else:
        return "snack"


async def log_meal_directly(
    db: Client,
    user_id: str,
    meal_type: MealType,
    meal_date: str,
    foods: list[dict],
) -> dict:
    """
    Log a meal directly to the database

    Args:
        db: Supabase client
        user_id: User ID
        meal_type: Type of meal
        meal_date: Date in YYYY-MM-DD format
        foods: List of food items with name, quantity, calories, protein, carbs, fat

    Returns:
        Result dict with success status and message
    """
    # Process foods
    processed_foods = [
        {
            "name": f["name"],
            "quantity": f.get("quantity", 1),
            "calories": round(f["calories"] * f.get("quantity", 1)),
            "protein": round(f["protein"] * f.get("quantity", 1) * 10) / 10,
            "carbs": round(f["carbs"] * f.get("quantity", 1) * 10) / 10,
            "fat": round(f["fat"] * f.get("quantity", 1) * 10) / 10,
        }
        for f in foods
    ]

    new_items_calories = sum(f["calories"] for f in processed_foods)

    # Check for existing meal
    try:
        existing_result = db.table("meals").select(
            "id, total_calories"
        ).eq("user_id", user_id).eq("date", meal_date).eq("meal_type", meal_type).maybe_single().execute()
        existing_meal = existing_result.data if existing_result else None
    except Exception:
        existing_meal = None

    if existing_meal:
        meal_id = existing_meal["id"]

        # Check for duplicate foods
        existing_items_result = db.table("meal_items").select("name").eq("meal_id", meal_id).execute()
        existing_names = {item["name"].lower() for item in (existing_items_result.data or [])}

        # Filter out duplicates
        new_foods = [f for f in processed_foods if f["name"].lower() not in existing_names]

        if not new_foods:
            food_names = ", ".join(f["name"] for f in processed_foods)
            return {"success": True, "message": f"{food_names}은(는) 이미 기록되어 있어요!"}

        new_calories = sum(f["calories"] for f in new_foods)
        total_calories = (existing_meal.get("total_calories") or 0) + new_calories

        # Insert new items
        meal_items = [
            {
                "meal_id": meal_id,
                "name": f["name"],
                "calories": f["calories"],
                "protein_g": f["protein"],
                "carbs_g": f["carbs"],
                "fat_g": f["fat"],
                "quantity": f"{f['quantity']}인분",
            }
            for f in new_foods
        ]

        db.table("meal_items").insert(meal_items).execute()
        db.table("meals").update({"total_calories": total_calories}).eq("id", meal_id).execute()

        food_names = ", ".join(f["name"] for f in new_foods)
        return {"success": True, "message": f"{food_names} ({new_calories}kcal) 기록 완료"}

    else:
        # Create new meal
        total_calories = new_items_calories

        # Insert and get the ID back
        meal_insert = db.table("meals").insert({
            "user_id": user_id,
            "date": meal_date,
            "meal_type": meal_type,
            "total_calories": total_calories,
        }).execute()

        if not meal_insert.data:
            return {"success": False, "message": "식사 기록 실패"}

        meal_id = meal_insert.data[0]["id"]

        meal_items = [
            {
                "meal_id": meal_id,
                "name": f["name"],
                "calories": f["calories"],
                "protein_g": f["protein"],
                "carbs_g": f["carbs"],
                "fat_g": f["fat"],
                "quantity": f"{f['quantity']}인분",
            }
            for f in processed_foods
        ]

        db.table("meal_items").insert(meal_items).execute()

        food_names = ", ".join(f["name"] for f in processed_foods)
        return {"success": True, "message": f"{food_names} ({total_calories}kcal) 기록 완료"}


async def get_meals_data(
    db: Client,
    user_id: str,
    meal_date: str,
    meal_type: str,
) -> dict:
    """Get meals data for a given date and type"""
    query = db.table("meals").select("*, meal_items (*)").eq("user_id", user_id).eq("date", meal_date)

    if meal_type != "all":
        query = query.eq("meal_type", meal_type)

    result = query.order("created_at", desc=False).execute()
    meals = result.data or []

    if not meals:
        return {"success": True, "message": f"{meal_date} 식단 기록이 없습니다.", "data": None}

    summary_lines = []
    for m in meals:
        items = m.get("meal_items", []) or []
        item_names = ", ".join(item.get("name", "") for item in items)
        label = MEAL_TYPE_LABELS.get(m.get("meal_type"), "")
        summary_lines.append(f"{label}: {item_names} ({m.get('total_calories', 0)}kcal)")

    summary = "\n".join(summary_lines)
    total_calories = sum(m.get("total_calories", 0) or 0 for m in meals)

    return {
        "success": True,
        "message": f"{meal_date} 식단:\n{summary}\n총 {total_calories}kcal",
        "data": meals,
    }


async def delete_meal_data(
    db: Client,
    user_id: str,
    meal_date: str,
    meal_type: MealType,
    food_name: Optional[str] = None,
) -> dict:
    """Delete meal or specific food item"""
    meal_result = db.table("meals").select(
        "id, total_calories, meal_items (id, name, calories)"
    ).eq("user_id", user_id).eq("date", meal_date).eq("meal_type", meal_type).maybe_single().execute()

    meal = meal_result.data
    if not meal:
        return {"success": False, "message": f"{meal_date} {MEAL_TYPE_LABELS[meal_type]} 기록이 없습니다."}

    if food_name:
        # Delete specific item
        items = meal.get("meal_items", []) or []
        target_item = None
        for item in items:
            if food_name.lower() in item.get("name", "").lower():
                target_item = item
                break

        if not target_item:
            return {"success": False, "message": f'"{food_name}"을(를) 찾을 수 없습니다.'}

        db.table("meal_items").delete().eq("id", target_item["id"]).execute()

        new_total = max(0, (meal.get("total_calories") or 0) - target_item.get("calories", 0))
        db.table("meals").update({"total_calories": new_total}).eq("id", meal["id"]).execute()

        # If last item, delete the meal
        if len(items) == 1:
            db.table("meals").delete().eq("id", meal["id"]).execute()

        return {"success": True, "message": f'"{target_item["name"]}" 삭제 완료'}

    # Delete entire meal
    db.table("meals").delete().eq("id", meal["id"]).execute()
    return {"success": True, "message": f"{MEAL_TYPE_LABELS[meal_type]} 전체 삭제 완료"}


async def update_meal_data(
    db: Client,
    user_id: str,
    meal_date: str,
    meal_type: MealType,
    old_food_name: str,
    new_food: dict,
) -> dict:
    """Update a food item in a meal"""
    meal_result = db.table("meals").select(
        "id, total_calories, meal_items (id, name, calories)"
    ).eq("user_id", user_id).eq("date", meal_date).eq("meal_type", meal_type).maybe_single().execute()

    meal = meal_result.data
    if not meal:
        return {"success": False, "message": f"{meal_date} {MEAL_TYPE_LABELS[meal_type]} 기록이 없습니다."}

    items = meal.get("meal_items", []) or []
    target_item = None
    for item in items:
        if old_food_name.lower() in item.get("name", "").lower():
            target_item = item
            break

    if not target_item:
        return {"success": False, "message": f'"{old_food_name}"을(를) 찾을 수 없습니다.'}

    # Update the item
    db.table("meal_items").update({
        "name": new_food["name"],
        "calories": new_food["calories"],
        "protein_g": new_food["protein"],
        "carbs_g": new_food["carbs"],
        "fat_g": new_food["fat"],
    }).eq("id", target_item["id"]).execute()

    # Update meal total
    calories_diff = new_food["calories"] - target_item.get("calories", 0)
    new_total = max(0, (meal.get("total_calories") or 0) + calories_diff)
    db.table("meals").update({"total_calories": new_total}).eq("id", meal["id"]).execute()

    return {"success": True, "message": f'"{target_item["name"]}" → "{new_food["name"]}" 수정 완료'}

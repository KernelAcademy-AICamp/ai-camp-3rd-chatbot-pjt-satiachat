"""
Medication RAG chatbot API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from api.deps import get_current_user, TokenData
from core.database import get_supabase

router = APIRouter(prefix="/medication", tags=["Medication RAG"])

# RAG instance (lazy loaded)
_rag_initialized = False


def get_rag_instance():
    """Get RAG instance with lazy initialization"""
    global _rag_initialized
    from rag.core import get_rag
    rag = get_rag()
    if not _rag_initialized:
        try:
            rag.initialize()
            _rag_initialized = True
        except FileNotFoundError as e:
            print(f"[RAG] Warning: {e}")
    return rag


class MedicationQueryRequest(BaseModel):
    """Medication query request"""
    query: str
    include_health_context: bool = True
    use_rag: bool = True
    intent: str = "medication_info"


class MedicationQueryResponse(BaseModel):
    """Medication query response"""
    response: str
    is_emergency: bool = False
    sources: list[str] = []


async def fetch_health_context(user_id: str) -> str:
    """Fetch user health context for RAG"""
    db = get_supabase()
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=6)).isoformat()

    context_parts = []

    # 1. Profile
    profile_result = db.table("user_profiles").select(
        "current_weight_kg, goal_weight_kg, target_calories"
    ).eq("user_id", user_id).maybe_single().execute()

    if profile_result.data:
        p = profile_result.data
        context_parts.append(f"현재 체중: {p.get('current_weight_kg')}kg, 목표 체중: {p.get('goal_weight_kg')}kg")
        context_parts.append(f"일일 목표 칼로리: {p.get('target_calories')}kcal")

    # 2. Recent weight records
    weight_result = db.table("progress_logs").select(
        "date, weight_kg"
    ).eq("user_id", user_id).gte("date", week_ago).order("date", desc=False).execute()

    if weight_result.data:
        weights = weight_result.data
        weight_str = ", ".join([f"{w['date']}: {w['weight_kg']}kg" for w in weights[-5:]])
        context_parts.append(f"최근 체중 기록: {weight_str}")

    # 3. Today's calories
    meals_result = db.table("meals").select(
        "total_calories"
    ).eq("user_id", user_id).eq("date", today).execute()

    if meals_result.data:
        total_cal = sum(m.get("total_calories", 0) or 0 for m in meals_result.data)
        context_parts.append(f"오늘 섭취 칼로리: {total_cal}kcal")

    # 4. Active medications with recent logs
    meds_result = db.table("medications").select(
        "id, name, dosage, frequency, time_of_day"
    ).eq("user_id", user_id).eq("is_active", True).execute()

    if meds_result.data:
        med_list = [f"{m['name']} {m.get('dosage', '')} ({m.get('frequency', '')})" for m in meds_result.data]
        context_parts.append(f"복용 중인 약물: {', '.join(med_list)}")

        # Recent medication logs
        for med in meds_result.data:
            logs_result = db.table("medication_logs").select(
                "taken_at, status"
            ).eq("medication_id", med.get("id")).gte(
                "taken_at", week_ago
            ).order("taken_at", desc=True).limit(5).execute()

            if logs_result.data:
                taken_count = sum(1 for l in logs_result.data if l.get("status") == "taken")
                context_parts.append(f"  - {med['name']}: 최근 {len(logs_result.data)}회 중 {taken_count}회 복용")

    return "\n".join(context_parts) if context_parts else ""


@router.post("/ask", response_model=MedicationQueryResponse)
async def ask_medication(
    request: MedicationQueryRequest,
    user: TokenData = Depends(get_current_user)
):
    """
    Process medication-related questions using RAG

    - RAG-based response (Wegovy/Mounjaro info)
    - Emergency detection
    - Optionally includes user health data context
    """
    try:
        rag = get_rag_instance()

        # Fetch health context if requested
        user_context = ""
        if request.include_health_context:
            user_context = await fetch_health_context(user.user_id)

        # Query RAG
        result = rag.ask(
            query=request.query,
            user_context=user_context,
            use_rag=request.use_rag,
            intent=request.intent,
        )

        # Save to chat_messages
        db = get_supabase()
        db.table("chat_messages").insert({
            "user_id": user.user_id,
            "role": "user",
            "content": request.query,
            "chat_type": "medication",
        }).execute()

        db.table("chat_messages").insert({
            "user_id": user.user_id,
            "role": "assistant",
            "content": result["response"],
            "chat_type": "medication",
        }).execute()

        return MedicationQueryResponse(
            response=result["response"],
            is_emergency=result["is_emergency"],
            sources=result["sources"],
        )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail="RAG not initialized. Please run setup scripts first."
        )
    except Exception as e:
        print(f"[Medication API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_medication_chat_history(
    limit: int = 50,
    user: TokenData = Depends(get_current_user)
):
    """Get medication chat history"""
    try:
        db = get_supabase()
        result = db.table("chat_messages").select("*").eq(
            "user_id", user.user_id
        ).eq("chat_type", "medication").order(
            "created_at", desc=True
        ).limit(limit).execute()

        messages = list(reversed(result.data or []))
        return {"messages": messages, "total": len(messages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
async def clear_medication_chat_history(
    user: TokenData = Depends(get_current_user)
):
    """Clear medication chat history"""
    try:
        db = get_supabase()
        db.table("chat_messages").delete().eq(
            "user_id", user.user_id
        ).eq("chat_type", "medication").execute()
        return {"success": True, "message": "Medication chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

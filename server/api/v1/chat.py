"""
Diet chatbot API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal

from api.deps import get_current_user, get_db, TokenData
from core.database import get_supabase
from ai.openai_client import get_client
from services.chat_service import (
    process_message,
    get_chat_history as get_history,
    clear_chat_history as clear_history,
)

router = APIRouter(prefix="/chat", tags=["Diet Chat"])


class ChatRequest(BaseModel):
    """Chat message request"""
    content: str
    persona: Literal["cold", "bright", "strict"] = "bright"


class ChatResponse(BaseModel):
    """Chat message response"""
    message: str
    intent: str
    action_result: Optional[dict] = None


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    user: TokenData = Depends(get_current_user)
):
    """
    Process diet chatbot message

    Flow:
    1. Classify intent (log/query/stats/modify/analyze/chat)
    2. Fetch user context from Supabase
    3. Build prompt based on intent
    4. Call OpenAI (with Function Calling if needed)
    5. Execute DB operations (log/modify/delete)
    6. Return response
    """
    try:
        openai_client = get_client()
        db = get_supabase()

        result = await process_message(
            openai_client=openai_client,
            db=db,
            user_id=user.user_id,
            content=request.content,
            persona=request.persona,
        )

        return ChatResponse(
            message=result["message"],
            intent=result["intent"],
            action_result=result.get("action_result"),
        )
    except Exception as e:
        print(f"[Chat API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_chat_history(
    limit: int = 50,
    user: TokenData = Depends(get_current_user)
):
    """Get chat history for the current user"""
    try:
        db = get_supabase()
        messages = await get_history(db, user.user_id, limit)
        return {"messages": messages, "total": len(messages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
async def clear_chat_history(
    user: TokenData = Depends(get_current_user)
):
    """Clear chat history for the current user"""
    try:
        db = get_supabase()
        await clear_history(db, user.user_id)
        return {"success": True, "message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

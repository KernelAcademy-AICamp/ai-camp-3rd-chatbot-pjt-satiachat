"""
Chat service - Main chatbot logic
Implements 2-step AI call structure
"""
from typing import Optional
from supabase import Client
from openai import AsyncOpenAI

from ai.prompts.classifier import classify_intent, ChatIntent
from ai.prompts.builders import (
    UserContext,
    build_log_prompt,
    build_query_prompt,
    build_stats_prompt,
    build_modify_prompt,
    build_analyze_prompt,
    build_chat_prompt,
    CoachPersona,
)
from ai.tools.food_tools import (
    get_tools_for_intent,
    parse_log_meal_args,
    parse_get_meals_args,
    parse_delete_meal_args,
    parse_update_meal_args,
    get_today_local,
)
from services.user_context import fetch_user_context
from services.meal_service import (
    log_meal_directly,
    get_meals_data,
    delete_meal_data,
    update_meal_data,
    infer_meal_type,
)


# Chat type for diet conversations
CHAT_TYPE = "diet"


def build_prompt_for_intent(
    intent: ChatIntent,
    persona: CoachPersona,
    context: UserContext,
) -> str:
    """Build the appropriate prompt based on intent"""
    if intent == "log":
        return build_log_prompt(persona, context)
    elif intent == "query":
        return build_query_prompt(persona, context)
    elif intent == "stats":
        return build_stats_prompt(persona, context)
    elif intent == "modify":
        return build_modify_prompt(persona, context)
    elif intent == "analyze":
        return build_analyze_prompt(persona, context)
    else:
        return build_chat_prompt(persona)


async def process_message(
    openai_client: AsyncOpenAI,
    db: Client,
    user_id: str,
    content: str,
    persona: CoachPersona,
) -> dict:
    """
    Process a chat message through the 2-step AI pipeline

    Args:
        openai_client: OpenAI client
        db: Supabase client
        user_id: User ID
        content: User message content
        persona: Coach persona

    Returns:
        Dict with message, intent, and optional action_result
    """
    # 1. Save user message
    db.table("chat_messages").insert({
        "user_id": user_id,
        "role": "user",
        "content": content,
        "chat_type": CHAT_TYPE,
    }).execute()

    # 2. Step 1: Classify intent
    intent = await classify_intent(openai_client, content)
    print(f"[Chat] Intent classified: {intent}")

    # 3. Fetch user context (except for chat)
    if intent != "chat":
        user_context = await fetch_user_context(db, user_id)
    else:
        user_context = UserContext(today=get_today_local())

    # 4. Build prompt and get tools
    system_prompt = build_prompt_for_intent(intent, persona, user_context)
    tools = get_tools_for_intent(intent)

    # 5. Call OpenAI
    completion_params = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        "max_tokens": 150 if intent == "chat" else 500,
        "temperature": 0.7,
    }

    if tools:
        completion_params["tools"] = tools
        if intent == "query":
            completion_params["tool_choice"] = {
                "type": "function",
                "function": {"name": "get_meals"},
            }
        else:
            completion_params["tool_choice"] = "auto"

    response = await openai_client.chat.completions.create(**completion_params)
    response_message = response.choices[0].message
    assistant_content = response_message.content or ""

    # 6. Process Function Calling
    action_result = None
    if response_message.tool_calls:
        tool_results_with_ids = []
        processed_calls = set()

        for tool_call in response_message.tool_calls:
            func_name = tool_call.function.name
            func_args = tool_call.function.arguments

            # Prevent duplicate calls
            call_key = f"{func_name}:{func_args}"
            if call_key in processed_calls:
                tool_results_with_ids.append({
                    "id": tool_call.id,
                    "result": "(중복 호출 - 스킵됨)",
                })
                continue
            processed_calls.add(call_key)

            result = ""
            print(f"[Chat] Function call: {func_name}")

            if func_name == "log_meal":
                args = parse_log_meal_args(func_args)
                if args:
                    res = await log_meal_directly(
                        db,
                        user_id,
                        args.get("meal_type") or infer_meal_type(),
                        args.get("date") or get_today_local(),
                        args["foods"],
                    )
                    result = res["message"]

            elif func_name == "get_meals":
                args = parse_get_meals_args(func_args)
                res = await get_meals_data(
                    db,
                    user_id,
                    args.get("date") or get_today_local(),
                    args.get("meal_type") or "all",
                )
                result = res["message"]

            elif func_name == "delete_meal":
                args = parse_delete_meal_args(func_args)
                if args:
                    res = await delete_meal_data(
                        db,
                        user_id,
                        args["date"],
                        args["meal_type"],
                        args.get("food_name"),
                    )
                    result = res["message"]

            elif func_name == "update_meal":
                args = parse_update_meal_args(func_args)
                if args:
                    res = await update_meal_data(
                        db,
                        user_id,
                        args["date"],
                        args["meal_type"],
                        args["old_food_name"],
                        args["new_food"],
                    )
                    result = res["message"]

            tool_results_with_ids.append({
                "id": tool_call.id,
                "result": result or "completed",
            })

        # Generate follow-up response with tool results
        if tool_results_with_ids and not assistant_content:
            tool_messages = [
                {
                    "role": "tool",
                    "tool_call_id": tr["id"],
                    "content": tr["result"],
                }
                for tr in tool_results_with_ids
            ]

            follow_up_response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": content},
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                            for tc in response_message.tool_calls
                        ],
                    },
                    *tool_messages,
                ],
                max_tokens=300,
                temperature=0.7,
            )

            assistant_content = follow_up_response.choices[0].message.content or ""
            if not assistant_content:
                assistant_content = "\n".join(tr["result"] for tr in tool_results_with_ids)

        action_result = {
            "tool_calls": [tr["result"] for tr in tool_results_with_ids],
        }

    # 7. Fallback
    if not assistant_content:
        assistant_content = "응답을 생성할 수 없습니다."

    # 8. Save assistant message
    db.table("chat_messages").insert({
        "user_id": user_id,
        "role": "assistant",
        "content": assistant_content,
        "chat_type": CHAT_TYPE,
    }).execute()

    return {
        "message": assistant_content,
        "intent": intent,
        "action_result": action_result,
    }


async def get_chat_history(
    db: Client,
    user_id: str,
    limit: int = 50,
) -> list[dict]:
    """Get chat history for a user"""
    result = db.table("chat_messages").select("*").eq(
        "user_id", user_id
    ).eq("chat_type", CHAT_TYPE).order(
        "created_at", desc=True
    ).limit(limit).execute()

    messages = result.data or []
    return list(reversed(messages))


async def clear_chat_history(db: Client, user_id: str) -> bool:
    """Clear chat history for a user"""
    db.table("chat_messages").delete().eq(
        "user_id", user_id
    ).eq("chat_type", CHAT_TYPE).execute()
    return True

import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CoachPersona = "cold" | "bright" | "strict";

const systemPrompts: Record<CoachPersona, string> = {
  cold: `You are a diet coach with a cool, factual personality.
- Be concise and data-driven
- No emojis
- Focus on numbers and facts
- Give practical, straightforward advice
- Respond in Korean`,

  bright: `You are a warm and supportive diet coach.
- Be encouraging and positive
- Use emojis appropriately
- Celebrate small wins
- Provide gentle guidance
- Respond in Korean`,

  strict: `You are a strict and direct diet coach.
- Be firm but fair
- Focus on goals and discipline
- Don't sugarcoat advice
- Push for accountability
- Respond in Korean`,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, persona, userId, context } = await req.json();

    if (!content || !persona || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Save user message
    const { data: userMsg, error: userError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        role: "user",
        content,
      })
      .select()
      .single();

    if (userError) {
      throw new Error(`Failed to save user message: ${userError.message}`);
    }

    // 2. Get recent messages for context
    const { data: recentMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Build system prompt with user context (meals, weight, etc.)
    let systemPrompt = systemPrompts[persona as CoachPersona];

    if (context) {
      systemPrompt += `\n\n--- 사용자 정보 ---\n${context}`;
    }

    // 4. Build messages array for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      ...(recentMessages || []).reverse().map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // 5. Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: persona === "cold" ? 0.3 : persona === "strict" ? 0.5 : 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantContent = openaiData.choices[0]?.message?.content || "응답을 생성할 수 없습니다.";

    // 6. Save assistant message
    const { data: assistantMsg, error: assistantError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        role: "assistant",
        content: assistantContent,
      })
      .select()
      .single();

    if (assistantError) {
      throw new Error(`Failed to save assistant message: ${assistantError.message}`);
    }

    return new Response(
      JSON.stringify({
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

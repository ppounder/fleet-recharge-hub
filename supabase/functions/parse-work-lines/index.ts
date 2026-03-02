import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, categories, codes } = await req.json();
    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build dynamic context for categories and codes
    const categoryList = Array.isArray(categories) && categories.length > 0
      ? categories.join(", ")
      : "maintenance, repair, mot, tyres, bodywork";

    let codesContext = "";
    if (Array.isArray(codes) && codes.length > 0) {
      codesContext = `\n\nAvailable work codes (with their parent category):\n${codes.map((c: any) => `- "${c.name}" (category: "${c.category}")`).join("\n")}`;
    }

    const systemPrompt = `You are a fleet SMR (Service, Maintenance & Repair) work line parser.
Given a free-text job description, extract individual work lines.

Available work categories: ${categoryList}${codesContext}

Rules:
- Each distinct task/item becomes one work line.
- Match each line to the best-fitting category from the available list. Default to the first category if unsure.
- If work codes are available, try to match each line to the most appropriate work code. Set workCode to the exact code name, or empty string if no match.
- If a price is mentioned (e.g. "£120"), use it as unitPrice. Otherwise use 0.
- If quantity is mentioned use it, otherwise default to 1.
- Keep descriptions concise and professional.

Return a JSON array using the suggest_work_lines tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_work_lines",
              description: "Return parsed work lines from the job description.",
              parameters: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        category: { type: "string", description: "The work category name" },
                        workCode: { type: "string", description: "The work code name, or empty string if no match" },
                        quantity: { type: "number" },
                        unitPrice: { type: "number" },
                      },
                      required: ["description", "category", "workCode", "quantity", "unitPrice"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_work_lines" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ lines: parsed.lines }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-work-lines error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const ALLOWED_ORIGINS = new Set([
  "https://mike798-cloud.github.io",
  "https://bu-tian-bao-gao.pages.dev"
]);

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const QUESTION_CONCEPTS = {
  q1: ["created_before_accident", "report_generated_early"],
  q2: ["previous_intervention", "route_changed"],
  q3: ["economic_loss", "stable_range"],
  q4: ["economic_optimization", "human_as_cost"],
  q5: ["risk_not_removed", "risk_reallocated"],
  q6: ["no_people", "equipment_loss", "controlled_event"],
  q7: ["human_confirmation", "compliance_or_authorization"],
  q8: ["minimize_economic_loss", "human_safety_not_hard_constraint"],
  q9: ["medical", "legal", "downtime", "reputation", "retention", "human_harm_hard_constraint"]
};

function cors(origin = "") {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status = 200, origin = "", extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: { ...cors(origin), ...extraHeaders }
  });
}

function normalizeAiPayload(raw, allowedConcepts) {
  let payload = raw;
  if (typeof payload === "string") {
    payload = JSON.parse(payload);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("INVALID_AI_PAYLOAD");
  }
  const incoming = payload.concepts;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    throw new Error("INVALID_AI_CONCEPTS");
  }
  const concepts = Object.fromEntries(
    allowedConcepts.map((key) => [key, incoming[key] === true])
  );
  return {
    concepts,
    hardConstraint: payload.hardConstraint === true
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.has(origin);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: allowed ? cors(origin) : { "Cache-Control": "no-store", "Vary": "Origin" }
      });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "bu-tian-bao-gao-semantic-judge",
        model: MODEL,
        aiBinding: Boolean(env?.AI?.run)
      }, 200, origin);
    }

    if (url.pathname !== "/judge") {
      return json({ error: "Not Found" }, 404, origin);
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405, origin, { "Allow": "POST, OPTIONS" });
    }

    if (!allowed) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    if (!env?.AI?.run) {
      return json({ error: "AI_BINDING_UNAVAILABLE" }, 503, origin);
    }

    try {
      const body = await request.json();
      const questionId = body?.questionId;
      const answer = body?.answer;
      const allowedConcepts = QUESTION_CONCEPTS[questionId];

      if (!allowedConcepts || typeof answer !== "string" || !answer.trim() || answer.length > 600) {
        return json({ error: "Invalid input" }, 400, origin);
      }

      const result = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: `你只做中文语义标签提取，不判断剧情、不生成答案、不补充玩家没有表达的内容。\n问题ID：${questionId}\n允许的概念标签：${allowedConcepts.join(", ")}\n请判断玩家回答明确表达了哪些标签。只有语义真实包含才设为 true。若玩家明确提出“任何人员伤害都不可接受/必须为零/设为硬约束”，hardConstraint=true。返回JSON。`
          },
          { role: "user", content: answer.trim() }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              concepts: {
                type: "object",
                properties: Object.fromEntries(
                  allowedConcepts.map((key) => [key, { type: "boolean" }])
                ),
                required: allowedConcepts,
                additionalProperties: false
              },
              hardConstraint: { type: "boolean" }
            },
            required: ["concepts", "hardConstraint"],
            additionalProperties: false
          }
        },
        temperature: 0.1,
        max_tokens: 180
      });

      const payload = normalizeAiPayload(result?.response, allowedConcepts);
      return json(payload, 200, origin);
    } catch (error) {
      return json({ error: "SEMANTIC_JUDGE_FAILED" }, 500, origin);
    }
  }
};

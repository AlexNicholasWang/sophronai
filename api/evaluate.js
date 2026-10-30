const MAX_TEXT = 8000;

function clean(value, max = MAX_TEXT) {
  return String(value || "").trim().slice(0, max);
}

function extractText(payload) {
  if (!payload || !Array.isArray(payload.output)) return "";
  return payload.output
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(part => typeof part.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseJson(text) {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const goal = clean(req.body?.goal, 1200);
  const action = clean(req.body?.action, 2400);
  const context = clean(req.body?.context, 3200);
  const constraints = clean(req.body?.constraints, 1600);

  if (!goal || !action) {
    return res.status(400).json({ error: "Goal and proposed action are required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI evaluator is not configured.",
      fallback: true
    });
  }

  const system = `
You are Sophron, a bounded consequence evaluator for autonomous-agent actions.

Your job is not to predict the entire future. Evaluate only decision-relevant consequences within a fixed causal horizon, then stop. This avoids infinite regress by making the stopping rule explicit.

Evaluation protocol:
1. Identify the intended goal and the concrete action.
2. Surface up to 4 material assumptions.
3. Roll out at most 3 causal orders:
   - Order 1: direct effects.
   - Order 2: likely reactions, dependencies, and indirect effects.
   - Order 3: only high-impact downstream effects that could change the decision.
4. Consider stakeholders, reversibility, blast radius, privacy/security, resource cost, externalities, and policy/permission boundaries when relevant.
5. Distinguish uncertainty from danger. Unknowns should reduce confidence rather than automatically imply failure.
6. Produce a decision:
   - approve: action is reasonable as proposed;
   - modify: action could proceed with concrete changes or safeguards;
   - block: expected downside or missing authorization is too severe.
7. Provide a revised action that is safer and still goal-directed.
8. Stop after 3 causal orders or earlier if additional speculation would not materially change the decision.

Return JSON only. No markdown, no commentary outside JSON.

Required shape:
{
  "summary": "string",
  "verdict": "approve|modify|block",
  "confidence": 0,
  "overallRisk": 0,
  "boundedHorizon": "string",
  "assumptions": ["string"],
  "consequences": [
    {
      "order": 1,
      "outcome": "string",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high|critical",
      "valence": "positive|negative|mixed",
      "rationale": "string"
    }
  ],
  "failureModes": [
    {
      "mode": "string",
      "trigger": "string",
      "mitigation": "string"
    }
  ],
  "unknowns": ["string"],
  "safeguards": ["string"],
  "revisedAction": "string",
  "stopReason": "string"
}

Keep consequences to 4-8 total, failureModes to 2-4, unknowns to 2-4, safeguards to 2-5.
Scores are integers from 0 to 100. Higher overallRisk means more dangerous or costly.
`.trim();

  const input = [
    `GOAL:\n${goal}`,
    `PROPOSED ACTION:\n${action}`,
    context ? `CONTEXT:\n${context}` : "",
    constraints ? `CONSTRAINTS / POLICIES:\n${constraints}` : ""
  ].filter(Boolean).join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.SOPHRON_MODEL || "gpt-6-luna",
        instructions: system,
        input,
        max_output_tokens: 1800
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error("OpenAI error", payload);
      return res.status(502).json({ error: "Model request failed.", fallback: true });
    }

    const text = extractText(payload);
    if (!text) {
      return res.status(502).json({ error: "Model returned no evaluation.", fallback: true });
    }

    let evaluation;
    try {
      evaluation = parseJson(text);
    } catch (error) {
      console.error("JSON parse error", error, text);
      return res.status(502).json({ error: "Model returned an invalid evaluation.", fallback: true });
    }

    return res.status(200).json({ evaluation, source: "model" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Evaluator unavailable.", fallback: true });
  }
};

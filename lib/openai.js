const DEFAULT_MODEL = process.env.SOPHRON_MODEL || "gpt-6-luna";

function extractText(payload) {
  if (!payload || !Array.isArray(payload.output)) return "";
  return payload.output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .map((part) => typeof part.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function callStructuredModel({
  apiKey,
  instructions,
  input,
  schema,
  name,
  maxOutputTokens = 3200
}) {
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.code = "MODEL_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,\n      reasoning: { effort: reasoningEffort },
      instructions,
      input,
      store: false,
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Model request failed.");
    error.code = "MODEL_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }

  const text = extractText(payload);
  if (!text) {
    const error = new Error("Model returned no structured text.");
    error.code = "EMPTY_MODEL_RESULT";
    throw error;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (cause) {
    const error = new Error("Model returned invalid structured JSON.");
    error.code = "INVALID_MODEL_RESULT";
    error.cause = cause;
    throw error;
  }

  return {
    data,
    model: payload.model || model,
    requestId: payload.id || null
  };
}

module.exports = {
  DEFAULT_MODEL,
  callStructuredModel,
  extractText
};

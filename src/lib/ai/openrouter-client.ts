import { safeParseJSON } from "./json-parser";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

interface CallAIOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  retries?: number;
}

export async function callAI({
  systemPrompt,
  userMessage,
  model = "anthropic/claude-sonnet-4",
  maxTokens = 4096,
  temperature = 0.7,
  jsonMode = true,
  retries = 2,
}: CallAIOptions): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set. Add it in Vercel project settings → Environment Variables.");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[callAI] Attempt ${attempt + 1}, model=${model}, maxTokens=${maxTokens}`);

      const res = await fetch(OPENROUTER_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "https://spark.app",
          "X-Title": "Spark Interactive Engine",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          ...(jsonMode && {
            response_format: { type: "json_object" },
          }),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[callAI] HTTP ${res.status}:`, errText.slice(0, 500));
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();

      // Handle OpenRouter error responses
      if (data.error) {
        const errMsg = typeof data.error === "string"
          ? data.error
          : data.error.message || JSON.stringify(data.error);
        console.error(`[callAI] API error:`, errMsg);
        throw new Error(`OpenRouter API error: ${errMsg}`);
      }

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("[callAI] No content in response. Full response:", JSON.stringify(data).slice(0, 500));
        throw new Error("Empty response from model");
      }

      console.log(`[callAI] Got response, length=${content.length}`);

      if (jsonMode) {
        try {
          const parsed = safeParseJSON(content);
          const keys = typeof parsed === "object" && parsed !== null
            ? Object.keys(parsed).slice(0, 10).join(", ")
            : typeof parsed;
          console.log(`[callAI] Parsed JSON keys: ${keys}`);
          return parsed;
        } catch (parseErr) {
          console.error("[callAI] JSON parse failed. Raw content:", content.slice(0, 300));
          throw parseErr;
        }
      }

      return content;
    } catch (err) {
      console.error(`[callAI] Attempt ${attempt + 1}/${retries + 1} failed:`, err instanceof Error ? err.message : err);
      if (attempt === retries) throw err;
      const delay = 1000 * (attempt + 1);
      console.log(`[callAI] Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Unreachable");
}

interface ChatCompletionOptions {
  messages: { role: string; content: string }[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function chatCompletion({
  messages,
  model = "anthropic/claude-sonnet-4",
  maxTokens = 300,
  temperature = 0.6,
  jsonMode = true,
}: ChatCompletionOptions): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL || "https://spark.app",
      "X-Title": "Spark Interactive Engine",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages,
      ...(jsonMode && {
        response_format: { type: "json_object" },
      }),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `OpenRouter API error: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");

  if (jsonMode) {
    return safeParseJSON(content);
  }

  return content;
}

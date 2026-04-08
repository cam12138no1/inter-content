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
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
        const err = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${err}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Empty response from model");

      if (jsonMode) {
        return safeParseJSON(content);
      }

      return content;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
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
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("Empty response from model");

  if (jsonMode) {
    return safeParseJSON(content);
  }

  return content;
}

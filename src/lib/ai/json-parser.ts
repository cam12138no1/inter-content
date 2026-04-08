/**
 * Safely parse AI JSON output with fallback strategies.
 * AI responses often wrap JSON in markdown fences or include preamble text.
 */
export function safeParseJSON(raw: string): unknown {
  // Strategy 1: Direct parse
  const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Strategy 2: Find first { and last }
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(cleaned.slice(objStart, objEnd + 1));
    } catch {
      // continue
    }
  }

  // Strategy 3: Find first [ and last ]
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    } catch {
      // continue
    }
  }

  throw new Error(
    "AI output is not valid JSON: " + cleaned.slice(0, 200)
  );
}

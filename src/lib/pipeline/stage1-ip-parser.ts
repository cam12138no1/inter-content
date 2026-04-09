import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_1_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { IPProfile } from "@/types";

// Truncate novel text to avoid exceeding context limits (~120k chars ≈ ~30k tokens)
// ~50k chars ≈ ~12k tokens, well within model limits and keeps API fast
const MAX_NOVEL_CHARS = 50000;

export async function runStage1(
  ipId: string,
  novelText: string,
  ipName: string,
  targetMarket: string,
  socialPreferences: string[]
): Promise<IPProfile> {
  // Validate API key upfront
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set. Please add it in Vercel project settings.");
  }

  // Truncate if too long
  let text = novelText;
  if (text.length > MAX_NOVEL_CHARS) {
    console.warn(`[Stage1] Novel text truncated from ${text.length} to ${MAX_NOVEL_CHARS} chars`);
    text = text.slice(0, MAX_NOVEL_CHARS) + "\n\n[... text truncated due to length ...]";
  }

  const userMessage = `请分析以下IP：\n\nIP名称：${ipName}\n\n${text}\n\n目标市场：${targetMarket}\n社交场景偏好：${socialPreferences.join(", ")}`;

  const raw = await callAI({
    systemPrompt: STAGE_1_SYSTEM_PROMPT,
    userMessage,
    ...MODEL_CONFIG.pipeline,
    maxTokens: 8192,
    jsonMode: true,
  });

  // Normalize: ensure the result has the expected structure
  const result = raw as IPProfile;
  if (!result.title) result.title = ipName;
  if (!result.title_short) result.title_short = ipName.slice(0, 5);
  if (!result.characters) result.characters = [];
  if (!Array.isArray(result.characters)) result.characters = [];
  if (!result.iconic_scenes) result.iconic_scenes = [];
  if (!result.genre_tags) result.genre_tags = [];
  if (!result.tone) result.tone = { primary: "intense", secondary: "epic_tragic", emotional_range: [] };
  if (!result.world_rules) result.world_rules = { system_name: "", core_mechanic: "", power_system: "", one_sentence: "", setting_period: "" };
  if (!result.social_potential_score) {
    result.social_potential_score = {
      identity_test_fit: 5, challenge_fit: 5, confession_fit: 5,
      friend_comparison_fit: 5, overall: "5", best_social_format: "identity_test"
    };
  }

  await writeJSON(ipId, "ip_profile.json", result);
  return result;
}

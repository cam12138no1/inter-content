import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_1_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { IPProfile } from "@/types";

export async function runStage1(
  ipId: string,
  novelText: string,
  ipName: string,
  targetMarket: string,
  socialPreferences: string[]
): Promise<IPProfile> {
  const userMessage = `请分析以下IP：\n\nIP名称：${ipName}\n\n${novelText}\n\n目标市场：${targetMarket}\n社交场景偏好：${socialPreferences.join(", ")}`;

  const result = (await callAI({
    systemPrompt: STAGE_1_SYSTEM_PROMPT,
    userMessage,
    ...MODEL_CONFIG.pipeline,
    maxTokens: 8192,
    jsonMode: true,
  })) as IPProfile;

  await writeJSON(ipId, "ip_profile.json", result);
  return result;
}

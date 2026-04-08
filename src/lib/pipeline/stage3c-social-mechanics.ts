import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_3C_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { SceneGraph, SocialMechanics } from "@/types";

export async function runStage3C(
  ipId: string,
  sceneGraph: SceneGraph
): Promise<SocialMechanics> {
  const result = (await callAI({
    systemPrompt: STAGE_3C_SYSTEM_PROMPT,
    userMessage: JSON.stringify(sceneGraph),
    ...MODEL_CONFIG.pipeline,
    maxTokens: 6000,
    jsonMode: true,
  })) as SocialMechanics;

  await writeJSON(ipId, "social/all_social.json", result);
  return result;
}

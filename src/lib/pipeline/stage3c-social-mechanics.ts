import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_3C_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { SceneGraph, SocialMechanics } from "@/types";

export async function runStage3C(
  ipId: string,
  sceneGraph: SceneGraph
): Promise<SocialMechanics> {
  if (!sceneGraph.scenes || sceneGraph.scenes.length === 0) {
    console.warn("[Stage3C] No scenes found, skipping");
    return { scenes: [] };
  }

  const result = (await callAI({
    systemPrompt: STAGE_3C_SYSTEM_PROMPT,
    userMessage: JSON.stringify(sceneGraph),
    ...MODEL_CONFIG.pipeline,
    maxTokens: 6000,
    jsonMode: true,
  })) as SocialMechanics;

  // Ensure scenes array exists
  if (!result.scenes) result.scenes = [];

  await writeJSON(ipId, "social/all_social.json", result);
  return result;
}

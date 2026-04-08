import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_2_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { IPProfile, SceneGraph } from "@/types";

export async function runStage2(
  ipId: string,
  ipProfile: IPProfile
): Promise<SceneGraph> {
  const result = (await callAI({
    systemPrompt: STAGE_2_SYSTEM_PROMPT,
    userMessage: JSON.stringify(ipProfile),
    ...MODEL_CONFIG.pipeline,
    maxTokens: 12000,
    jsonMode: true,
  })) as SceneGraph;

  await writeJSON(ipId, "scene_graph.json", result);
  return result;
}

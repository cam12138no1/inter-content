import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_6_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type {
  IPProfile,
  SceneGraph,
  VisualScene,
  SocialMechanics,
  ShareConfig,
} from "@/types";

export async function runStage6(
  ipId: string,
  ipProfile: IPProfile,
  sceneGraph: SceneGraph,
  sceneVisuals: VisualScene[],
  socialMechanics: SocialMechanics
): Promise<ShareConfig> {
  const raw = await callAI({
    systemPrompt: STAGE_6_SYSTEM_PROMPT,
    userMessage: JSON.stringify({
      scenes: sceneGraph.scenes || [],
      visuals: sceneVisuals || [],
      social: socialMechanics || { scenes: [] },
      tone: ipProfile.tone || {},
    }),
    ...MODEL_CONFIG.pipeline,
    maxTokens: 6000,
    jsonMode: true,
  });

  const result = raw as ShareConfig;

  // Normalize
  if (!result.scenes) result.scenes = [];

  await writeJSON(ipId, "share/all_share_templates.json", result);
  return result;
}

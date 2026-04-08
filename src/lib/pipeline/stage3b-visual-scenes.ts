import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_3B_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { IPProfile, SceneGraph, VisualScene } from "@/types";

export async function runStage3B(
  ipId: string,
  ipProfile: IPProfile,
  sceneGraph: SceneGraph
): Promise<VisualScene[]> {
  const visualPromises = sceneGraph.scenes.map(async (scene) => {
    const chars = ipProfile.characters.filter((c) =>
      scene.characters_involved?.includes(c.char_id)
    );

    const visuals = (await callAI({
      systemPrompt: STAGE_3B_SYSTEM_PROMPT,
      userMessage: JSON.stringify({
        scene,
        tone: ipProfile.tone,
        characters: chars,
      }),
      ...MODEL_CONFIG.pipeline,
      maxTokens: 4096,
      jsonMode: true,
    })) as VisualScene;

    await writeJSON(ipId, `scenes/${scene.scene_id}_visuals.json`, visuals);
    return visuals;
  });

  return Promise.all(visualPromises);
}

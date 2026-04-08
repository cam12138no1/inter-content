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
  const scenes = sceneGraph.scenes || [];

  if (scenes.length === 0) {
    console.warn("[Stage3B] No scenes found, skipping");
    return [];
  }

  const visualPromises = scenes.map(async (scene) => {
    try {
      const chars = (ipProfile.characters || []).filter((c) =>
        (scene.characters_involved || []).includes(c.char_id)
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

      if (!visuals.scene_id) visuals.scene_id = scene.scene_id;

      await writeJSON(ipId, `scenes/${scene.scene_id}_visuals.json`, visuals);
      return visuals;
    } catch (err) {
      console.error(`[Stage3B] Failed for scene ${scene.scene_id}:`, err);
      const fallback: VisualScene = {
        scene_id: scene.scene_id,
        global_art_style: "anime semi-realistic, vibrant colors, cinematic lighting",
        pregenerated_images: [],
        dynamic_templates: { base_template: "", variables: {} },
        character_portraits: {},
        share_card_backgrounds: [],
      };
      await writeJSON(ipId, `scenes/${scene.scene_id}_visuals.json`, fallback);
      return fallback;
    }
  });

  return Promise.all(visualPromises);
}

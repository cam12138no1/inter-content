import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_4_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type {
  SceneGraph,
  CharacterCard,
  VisualScene,
  SocialMechanics,
  Blueprint,
} from "@/types";

export async function runStage4(
  ipId: string,
  sceneGraph: SceneGraph,
  characterCards: CharacterCard[],
  sceneVisuals: VisualScene[],
  socialMechanics: SocialMechanics
): Promise<Blueprint[]> {
  const blueprints: Blueprint[] = [];

  for (let i = 0; i < sceneGraph.scenes.length; i++) {
    const scene = sceneGraph.scenes[i];
    const chars = characterCards.filter((c) =>
      scene.characters_involved?.includes(c.char_id)
    );
    const socialForScene = socialMechanics.scenes?.find(
      (s) => s.scene_id === scene.scene_id
    );

    const blueprint = (await callAI({
      systemPrompt: STAGE_4_SYSTEM_PROMPT,
      userMessage: JSON.stringify({
        scene,
        characters: chars,
        visuals: sceneVisuals[i],
        social: socialForScene,
      }),
      ...MODEL_CONFIG.pipeline,
      maxTokens: 8192,
      jsonMode: true,
    })) as Blueprint;

    await writeJSON(
      ipId,
      `blueprints/${scene.scene_id}_blueprint.json`,
      blueprint
    );
    blueprints.push(blueprint);
  }

  return blueprints;
}

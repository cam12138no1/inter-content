import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_3A_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { IPProfile, SceneGraph, CharacterCard } from "@/types";

export async function runStage3A(
  ipId: string,
  ipProfile: IPProfile,
  sceneGraph: SceneGraph
): Promise<CharacterCard[]> {
  const characterPromises = ipProfile.characters.map(async (char) => {
    const scenesForChar = sceneGraph.scenes.filter((s) =>
      s.characters_involved?.includes(char.char_id)
    );

    const card = (await callAI({
      systemPrompt: STAGE_3A_SYSTEM_PROMPT,
      userMessage: JSON.stringify({
        character: char,
        scenes: scenesForChar,
        world_rules: ipProfile.world_rules,
        tone: ipProfile.tone,
      }),
      ...MODEL_CONFIG.pipeline,
      maxTokens: 6000,
      jsonMode: true,
    })) as CharacterCard;

    await writeJSON(ipId, `characters/${char.char_id}_card.json`, card);
    return card;
  });

  return Promise.all(characterPromises);
}

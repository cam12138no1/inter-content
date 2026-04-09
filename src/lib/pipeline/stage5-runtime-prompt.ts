import { writeText } from "../data/storage";
import type { Blueprint, CharacterCard, Scene } from "@/types";

/**
 * Stage 5: Runtime Prompt Assembler
 * This is NOT an AI call — it's a code-based template fill process.
 */
export function assembleRuntimePrompt(
  blueprint: Blueprint,
  characterCard: CharacterCard,
  _scene: Scene
): string | null {
  // Tier 1 doesn't need runtime prompt
  if (blueprint.tier === 1) return null;

  // Find dialogue step
  const dialogueStep = blueprint.interaction_sequence?.find(
    (s) => s.action === "ai_dialogue"
  );
  if (!dialogueStep) return null;

  // Select prompt version based on tier
  const prompt =
    blueprint.tier === 2
      ? characterCard.tier_2_system_prompt
      : characterCard.tier_1_5_system_prompt;

  if (!prompt) return null;

  // Inject scene context if available
  const contextInjection = dialogueStep.content
    ?.initial_context_injection as string;
  if (contextInjection && prompt.includes("【场景】")) {
    return prompt.replace(
      "【场景】",
      `【场景】${contextInjection}\n`
    );
  }

  return prompt;
}

export async function runStage5(
  ipId: string,
  scenes: Scene[],
  blueprints: Blueprint[],
  characterCards: CharacterCard[]
): Promise<void> {
  // Build lookup maps by scene_id (not array index!)
  const blueprintMap = new Map<string, Blueprint>();
  for (const bp of blueprints || []) {
    if (bp?.scene_id) blueprintMap.set(bp.scene_id, bp);
  }
  const charMap = new Map<string, CharacterCard>();
  for (const c of characterCards || []) {
    if (c?.char_id) charMap.set(c.char_id, c);
  }

  for (const scene of scenes || []) {
    const blueprint = blueprintMap.get(scene.scene_id);
    if (!blueprint || blueprint.tier <= 1) continue;

    const dialogueCharId = (scene.characters_involved || [])[0];
    if (!dialogueCharId) {
      console.warn(`[Stage5] Scene ${scene.scene_id} has no characters, skipping runtime prompt`);
      continue;
    }

    const charCard = charMap.get(dialogueCharId);
    if (!charCard) {
      console.warn(`[Stage5] Character ${dialogueCharId} not found for scene ${scene.scene_id}`);
      continue;
    }

    const runtimePrompt = assembleRuntimePrompt(blueprint, charCard, scene);
    if (runtimePrompt) {
      await writeText(
        ipId,
        `runtime/${scene.scene_id}_system_prompt.txt`,
        runtimePrompt
      );
    }
  }
}

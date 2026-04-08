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
  const dialogueStep = blueprint.interaction_sequence.find(
    (s) => s.action === "ai_dialogue"
  );
  if (!dialogueStep) return null;

  // Select prompt version based on tier
  const prompt =
    blueprint.tier === 2
      ? characterCard.tier_2_system_prompt
      : characterCard.tier_1_5_system_prompt;

  // Inject scene context if available
  const contextInjection = dialogueStep.content
    ?.initial_context_injection as string;
  if (contextInjection) {
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
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const blueprint = blueprints[i];

    if (blueprint.tier > 1) {
      const dialogueCharId = scene.characters_involved?.[0];
      const charCard = characterCards.find(
        (c) => c.char_id === dialogueCharId
      );

      if (charCard) {
        const runtimePrompt = assembleRuntimePrompt(
          blueprint,
          charCard,
          scene
        );
        if (runtimePrompt) {
          await writeText(
            ipId,
            `runtime/${scene.scene_id}_system_prompt.txt`,
            runtimePrompt
          );
        }
      }
    }
  }
}

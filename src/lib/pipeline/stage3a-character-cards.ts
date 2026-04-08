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
  const characters = ipProfile.characters || [];

  if (characters.length === 0) {
    console.warn("[Stage3A] No characters found in IP profile, skipping");
    return [];
  }

  const characterPromises = characters.map(async (char) => {
    try {
      const scenesForChar = (sceneGraph.scenes || []).filter((s) =>
        (s.characters_involved || []).includes(char.char_id)
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

      // Ensure char_id is set
      if (!card.char_id) card.char_id = char.char_id;
      if (!card.display_name) card.display_name = char.name;

      await writeJSON(ipId, `characters/${char.char_id}_card.json`, card);
      return card;
    } catch (err) {
      console.error(`[Stage3A] Failed to generate card for ${char.char_id}:`, err);
      // Return a minimal card so the pipeline can continue
      const fallback: CharacterCard = {
        char_id: char.char_id,
        display_name: char.name,
        tier_1_5_system_prompt: `你是${char.name}。${char.one_line}。\n【JSON输出格式】{"reply":"","suggested_responses":[],"emotion":"neutral","trust_delta":0,"turn":1,"is_final":false,"image_hint":null}`,
        tier_2_system_prompt: `你是${char.name}。${char.one_line}。\n【JSON输出格式】{"reply":"","suggested_responses":[],"emotion":"neutral","trust_delta":0,"turn":1,"is_final":false,"image_hint":null}`,
        personality_matrix: { core_traits: [], values: "", fears: "", desires: "" },
        speech_rules: {
          sentence_length: "normal",
          emotional_expression: "normal",
          humor_style: "none",
          formality: "casual",
          typical_phrases: [],
          never_says: [],
          language_quirks: "",
        },
        trust_system: {
          initial_level: 0,
          range: [-5, 5],
          positive_triggers: {},
          negative_triggers: {},
          level_behaviors: {},
        },
        image_emotion_map: {},
        knowledge_boundary: { knows: [], does_not_know: [], suspects: [] },
      };
      await writeJSON(ipId, `characters/${char.char_id}_card.json`, fallback);
      return fallback;
    }
  });

  return Promise.all(characterPromises);
}

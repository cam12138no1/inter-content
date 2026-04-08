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
  const scenes = sceneGraph.scenes || [];
  const blueprints: Blueprint[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    try {
      const chars = (characterCards || []).filter((c) =>
        (scene.characters_involved || []).includes(c.char_id)
      );
      const socialForScene = (socialMechanics.scenes || []).find(
        (s) => s.scene_id === scene.scene_id
      );

      const blueprint = (await callAI({
        systemPrompt: STAGE_4_SYSTEM_PROMPT,
        userMessage: JSON.stringify({
          scene,
          characters: chars,
          visuals: sceneVisuals[i] || null,
          social: socialForScene || null,
        }),
        ...MODEL_CONFIG.pipeline,
        maxTokens: 8192,
        jsonMode: true,
      })) as Blueprint;

      // Ensure required fields
      if (!blueprint.scene_id) blueprint.scene_id = scene.scene_id;
      if (!blueprint.tier) blueprint.tier = scene.tier;
      if (!blueprint.interaction_sequence) blueprint.interaction_sequence = [];
      if (!blueprint.state_machine) {
        blueprint.state_machine = {
          variables: {},
          update_rules: [],
          result_computation: { method: "direct_map", logic: "" },
          exit_conditions: [],
        };
      }

      await writeJSON(
        ipId,
        `blueprints/${scene.scene_id}_blueprint.json`,
        blueprint
      );
      blueprints.push(blueprint);
    } catch (err) {
      console.error(`[Stage4] Failed for scene ${scene.scene_id}:`, err);
      // Push a minimal blueprint so downstream doesn't break
      const fallback: Blueprint = {
        scene_id: scene.scene_id,
        tier: scene.tier,
        scene_type: scene.scene_type,
        duration: scene.duration,
        estimated_token_cost_per_play: "0",
        frontend_spec: {
          layout: scene.tier === 1 ? "card_swipe" : "chat_ui",
          entry_animation: "fade_in",
          background_image_ref: "",
          accent_color: "#6366f1",
        },
        interaction_sequence: [],
        state_machine: {
          variables: {},
          update_rules: [],
          result_computation: { method: "direct_map", logic: "" },
          exit_conditions: [],
        },
        social_integration: {
          share_card_template_ref: "",
          leaderboard_metric: "",
          friend_comparison_fields: [],
          viral_entry_behavior: "",
        },
      };
      await writeJSON(ipId, `blueprints/${scene.scene_id}_blueprint.json`, fallback);
      blueprints.push(fallback);
    }
  }

  return blueprints;
}

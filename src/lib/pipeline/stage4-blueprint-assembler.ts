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

  // Build lookup maps by scene_id (not array index!)
  const visualsMap = new Map<string, VisualScene>();
  for (const v of sceneVisuals || []) {
    if (v?.scene_id) visualsMap.set(v.scene_id, v);
  }
  const socialMap = new Map<string, typeof socialMechanics.scenes[0]>();
  for (const s of socialMechanics?.scenes || []) {
    if (s?.scene_id) socialMap.set(s.scene_id, s);
  }

  for (const scene of scenes) {
    try {
      const chars = (characterCards || []).filter((c) =>
        (scene.characters_involved || []).includes(c.char_id)
      );
      const visualForScene = visualsMap.get(scene.scene_id) || null;
      const socialForScene = socialMap.get(scene.scene_id) || null;

      const blueprint = (await callAI({
        systemPrompt: STAGE_4_SYSTEM_PROMPT,
        userMessage: JSON.stringify({
          scene,
          characters: chars,
          visuals: visualForScene,
          social: socialForScene,
        }),
        ...MODEL_CONFIG.pipeline,
        maxTokens: 8192,
        jsonMode: true,
      })) as Blueprint;

      // Ensure required fields
      if (!blueprint.scene_id) blueprint.scene_id = scene.scene_id;
      if (!blueprint.tier) blueprint.tier = scene.tier;
      if (!blueprint.scene_type) blueprint.scene_type = scene.scene_type || "identity_test";
      if (!blueprint.interaction_sequence) blueprint.interaction_sequence = [];
      if (!blueprint.frontend_spec) {
        blueprint.frontend_spec = {
          layout: scene.tier === 1 ? "card_swipe" : "chat_ui",
          entry_animation: "fade_in",
          background_image_ref: "",
          accent_color: "#6366f1",
        };
      }
      if (!blueprint.state_machine) {
        blueprint.state_machine = {
          variables: {},
          update_rules: [],
          result_computation: { method: "direct_map", logic: "" },
          exit_conditions: [],
        };
      }
      if (!blueprint.social_integration) {
        blueprint.social_integration = {
          share_card_template_ref: "",
          leaderboard_metric: "",
          friend_comparison_fields: [],
          viral_entry_behavior: "",
        };
      }

      await writeJSON(ipId, `blueprints/${scene.scene_id}_blueprint.json`, blueprint);
      blueprints.push(blueprint);
    } catch (err) {
      console.error(`[Stage4] Failed for scene ${scene.scene_id}:`, err);
      const fallback: Blueprint = {
        scene_id: scene.scene_id,
        tier: scene.tier,
        scene_type: scene.scene_type || "identity_test",
        duration: scene.duration || "3 min",
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

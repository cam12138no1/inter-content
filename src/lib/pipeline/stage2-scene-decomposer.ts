import { callAI } from "../ai/openrouter-client";
import { MODEL_CONFIG } from "../ai/model-config";
import { STAGE_2_SYSTEM_PROMPT } from "../prompts";
import { writeJSON } from "../data/storage";
import type { IPProfile, SceneGraph } from "@/types";

export async function runStage2(
  ipId: string,
  ipProfile: IPProfile
): Promise<SceneGraph> {
  const raw = await callAI({
    systemPrompt: STAGE_2_SYSTEM_PROMPT,
    userMessage: JSON.stringify(ipProfile),
    ...MODEL_CONFIG.pipeline,
    maxTokens: 4096,
    jsonMode: true,
  });

  const result = raw as SceneGraph;

  // Normalize: ensure required fields
  if (!result.ip_id) result.ip_id = ipId;
  if (!result.scenes) result.scenes = [];
  if (!Array.isArray(result.scenes)) {
    console.error("[Stage2] scenes is not an array:", typeof result.scenes);
    result.scenes = [];
  }

  // Normalize each scene
  for (let i = 0; i < result.scenes.length; i++) {
    const scene = result.scenes[i];
    if (!scene.scene_id) scene.scene_id = `s${String(i + 1).padStart(2, "0")}`;
    if (!scene.scene_title) scene.scene_title = `Scene ${i + 1}`;
    if (!scene.tier) scene.tier = 1;
    if (!scene.scene_type) scene.scene_type = "identity_test";
    if (!scene.characters_involved) scene.characters_involved = [];
    if (!scene.interaction_flow) scene.interaction_flow = [];
    if (!scene.result_logic) {
      scene.result_logic = {
        method: "direct_map",
        results: {
          default: {
            condition: "true",
            title: "Complete!",
            subtitle: "",
            description: "You completed this scene.",
            matching_character: null,
            visual_hint: "",
          },
        },
      };
    }
    if (!scene.share_exit) {
      scene.share_exit = {
        primary_cta: "Share Result",
        share_text_template: "I got {result}! Try it: {link}",
        friend_comparison: false,
        comparison_text: "",
        leaderboard: "none",
      };
    }
    if (!scene.hook) {
      scene.hook = { text: scene.scene_title, visual_hint: "" };
    }
    if (!scene.remix_params) scene.remix_params = [];
    if (!scene.return_hook) scene.return_hook = { type: "none", message: "" };
  }

  result.total_scenes = result.scenes.length;
  if (!result.tier_distribution) {
    const t1 = result.scenes.filter((s) => s.tier === 1).length;
    const t15 = result.scenes.filter((s) => s.tier === 1.5).length;
    const t2 = result.scenes.filter((s) => s.tier === 2).length;
    result.tier_distribution = { tier1: t1, tier1_5: t15, tier2: t2 };
  }

  await writeJSON(ipId, "scene_graph.json", result);
  return result;
}

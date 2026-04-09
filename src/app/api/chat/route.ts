import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/openrouter-client";
import { readText, readJSON, fileExists } from "@/lib/data/storage";
import { MODEL_CONFIG } from "@/lib/ai/model-config";
import type { Blueprint, ChatRequest, AIResponse, GameState } from "@/types";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const {
      ip_id,
      scene_id,
      user_message,
      conversation_history,
      current_state,
    } = body;

    if (!ip_id || !scene_id || !user_message) {
      return NextResponse.json(
        { error: "ip_id, scene_id, and user_message are required" },
        { status: 400 }
      );
    }

    // 1. Load blueprint for tier config
    const bpExists = await fileExists(ip_id, `blueprints/${scene_id}_blueprint.json`);
    if (!bpExists) {
      return NextResponse.json(
        { error: `Blueprint not found for scene: ${scene_id}` },
        { status: 404 }
      );
    }
    const blueprint = await readJSON<Blueprint>(
      ip_id,
      `blueprints/${scene_id}_blueprint.json`
    );

    // 2. Load runtime prompt (may not exist for Tier 1 scenes)
    let systemPrompt: string;
    const promptExists = await fileExists(ip_id, `runtime/${scene_id}_system_prompt.txt`);
    if (promptExists) {
      systemPrompt = await readText(ip_id, `runtime/${scene_id}_system_prompt.txt`);
    } else {
      // Fallback: generate a basic prompt
      systemPrompt = `你是一个互动故事角色。请用JSON格式回复。
【JSON输出格式】{"reply":"你的回复","suggested_responses":["选项1","选项2","选项3"],"emotion":"neutral","trust_delta":0,"turn":${(current_state?.turn || 0) + 1},"is_final":false,"image_hint":null}
【规则】每次回复不超过100字，只输出JSON`;
    }

    // 3. Inject current state
    const stateInjection = `\n\n【当前状态】trust=${current_state?.trust || 0}, turn=${current_state?.turn || 0}`;
    const fullSystemPrompt = systemPrompt + stateInjection;

    // 4. Build messages
    const messages = [
      { role: "system", content: fullSystemPrompt },
      ...(conversation_history || []),
      { role: "user", content: user_message },
    ];

    // 5. Select model config
    const tier = blueprint.tier || 1.5;
    const modelCfg =
      tier === 2
        ? MODEL_CONFIG.runtime_tier2
        : MODEL_CONFIG.runtime_tier15;

    // 6. Call AI
    const aiResponse = (await chatCompletion({
      messages,
      model: modelCfg.model,
      maxTokens: modelCfg.maxTokens,
      temperature: modelCfg.temperature,
      jsonMode: true,
    })) as AIResponse;

    // Normalize response
    if (!aiResponse.reply) aiResponse.reply = "";
    if (!aiResponse.suggested_responses) aiResponse.suggested_responses = [];
    if (!aiResponse.emotion) aiResponse.emotion = "neutral";
    if (aiResponse.trust_delta === undefined) aiResponse.trust_delta = 0;
    if (aiResponse.turn === undefined) aiResponse.turn = (current_state?.turn || 0) + 1;
    if (aiResponse.is_final === undefined) aiResponse.is_final = false;

    // 7. Update state
    const newState: GameState = {
      ...current_state,
      trust:
        ((current_state?.trust as number) || 0) + (aiResponse.trust_delta || 0),
      suspicion:
        ((current_state?.suspicion as number) || 0) +
        (aiResponse.suspicion_delta || 0),
      turn: ((current_state?.turn as number) || 0) + 1,
    };

    // 8. Check exit conditions
    const exitConditions = blueprint.state_machine?.exit_conditions || [];
    let sceneExit = null;
    for (const cond of exitConditions) {
      if (evaluateCondition(cond.condition, newState)) {
        sceneExit = cond;
        break;
      }
    }

    return NextResponse.json({
      ai_response: aiResponse,
      new_state: newState,
      scene_exit: sceneExit,
      generated_image_url: null,
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Chat request failed",
      },
      { status: 500 }
    );
  }
}

function evaluateCondition(
  condition: string,
  state: GameState
): boolean {
  try {
    const match = condition.match(
      /(\w+)\s*(>=|<=|===|==|>|<|!=)\s*(-?\d+)/
    );
    if (!match) return false;

    const [, varName, operator, valueStr] = match;
    const stateVal = Number(state[varName]) || 0;
    const condVal = Number(valueStr);

    switch (operator) {
      case ">=":
        return stateVal >= condVal;
      case "<=":
        return stateVal <= condVal;
      case ">":
        return stateVal > condVal;
      case "<":
        return stateVal < condVal;
      case "===":
      case "==":
        return stateVal === condVal;
      case "!=":
        return stateVal !== condVal;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

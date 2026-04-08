import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/openrouter-client";
import { readText, readJSON } from "@/lib/data/storage";
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

    // 1. Load runtime prompt
    const systemPrompt = await readText(
      ip_id,
      `runtime/${scene_id}_system_prompt.txt`
    );

    // 2. Load blueprint for tier config
    const blueprint = await readJSON<Blueprint>(
      ip_id,
      `blueprints/${scene_id}_blueprint.json`
    );

    // 3. Inject current state
    const stateInjection = `\n\n【当前状态】trust=${current_state.trust}, turn=${current_state.turn}`;
    const fullSystemPrompt = systemPrompt + stateInjection;

    // 4. Build messages
    const messages = [
      { role: "system", content: fullSystemPrompt },
      ...conversation_history,
      { role: "user", content: user_message },
    ];

    // 5. Select model config
    const tier = blueprint.tier;
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

    // 7. Update state
    const newState: GameState = {
      ...current_state,
      trust:
        (current_state.trust as number) + (aiResponse.trust_delta || 0),
      suspicion:
        (current_state.suspicion as number) +
        (aiResponse.suspicion_delta || 0),
      turn: (current_state.turn as number) + 1,
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
    // Simple condition evaluator for common patterns
    // e.g., "turn >= 5", "trust >= 4", "trust <= -3"
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

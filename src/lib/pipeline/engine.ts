import { ensureDirectories } from "../data/storage";
import { runStage1 } from "./stage1-ip-parser";
import { runStage2 } from "./stage2-scene-decomposer";
import { runStage3A } from "./stage3a-character-cards";
import { runStage3B } from "./stage3b-visual-scenes";
import { runStage3C } from "./stage3c-social-mechanics";
import { runStage4 } from "./stage4-blueprint-assembler";
import { runStage5 } from "./stage5-runtime-prompt";
import { runStage6 } from "./stage6-social-output";
import type { PipelineInput, PipelineProgress } from "@/types";

type ProgressCallback = (progress: PipelineProgress) => void;

export async function runPipeline(
  input: PipelineInput,
  onProgress: ProgressCallback
) {
  const ipId = input.ip_name.toLowerCase().replace(/\s+/g, "_");

  // Create directory structure
  await ensureDirectories(ipId);

  // Stage 1: IP Parser
  onProgress({
    stage: "stage1",
    status: "running",
    message: "Analyzing IP...",
  });
  let ipProfile;
  try {
    ipProfile = await runStage1(
      ipId,
      input.novel_text,
      input.ip_name,
      input.target_market,
      input.social_preferences
    );
    onProgress({
      stage: "stage1",
      status: "complete",
      message: `IP parsed: ${ipProfile.title}`,
    });
  } catch (err) {
    onProgress({
      stage: "stage1",
      status: "error",
      message: `Stage 1 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // Check social potential
  const overallScore = ipProfile.social_potential_score?.overall;
  if (overallScore && parseFloat(String(overallScore)) < 6) {
    onProgress({
      stage: "stage1",
      status: "complete",
      message: `Warning: Social potential score ${overallScore}/10 is low`,
    });
  }

  // Stage 2: Scene Decomposer
  onProgress({
    stage: "stage2",
    status: "running",
    message: "Designing interactive scenes...",
  });
  let sceneGraph;
  try {
    sceneGraph = await runStage2(ipId, ipProfile);
    onProgress({
      stage: "stage2",
      status: "complete",
      message: `${sceneGraph.total_scenes || sceneGraph.scenes?.length} scenes designed`,
    });
  } catch (err) {
    onProgress({
      stage: "stage2",
      status: "error",
      message: `Stage 2 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // Stage 3: Parallel Generation
  onProgress({
    stage: "stage3a",
    status: "running",
    message: "Generating character cards...",
  });
  onProgress({
    stage: "stage3b",
    status: "running",
    message: "Generating visual scenes...",
  });
  onProgress({
    stage: "stage3c",
    status: "running",
    message: "Designing social mechanics...",
  });

  let characterCards, sceneVisuals, socialMechanics;
  try {
    [characterCards, sceneVisuals, socialMechanics] = await Promise.all([
      runStage3A(ipId, ipProfile, sceneGraph).then((result) => {
        onProgress({
          stage: "stage3a",
          status: "complete",
          message: `${result.length} character cards generated`,
        });
        return result;
      }),
      runStage3B(ipId, ipProfile, sceneGraph).then((result) => {
        onProgress({
          stage: "stage3b",
          status: "complete",
          message: `${result.length} visual scenes generated`,
        });
        return result;
      }),
      runStage3C(ipId, sceneGraph).then((result) => {
        onProgress({
          stage: "stage3c",
          status: "complete",
          message: "Social mechanics designed",
        });
        return result;
      }),
    ]);
  } catch (err) {
    onProgress({
      stage: "stage3a",
      status: "error",
      message: `Stage 3 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // Stage 4: Blueprint Assembly
  onProgress({
    stage: "stage4",
    status: "running",
    message: "Assembling blueprints...",
  });
  let blueprints;
  try {
    blueprints = await runStage4(
      ipId,
      sceneGraph,
      characterCards,
      sceneVisuals,
      socialMechanics
    );
    onProgress({
      stage: "stage4",
      status: "complete",
      message: `${blueprints.length} blueprints assembled`,
    });
  } catch (err) {
    onProgress({
      stage: "stage4",
      status: "error",
      message: `Stage 4 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // Stage 5: Runtime Prompts (code-based, no AI)
  onProgress({
    stage: "stage5",
    status: "running",
    message: "Assembling runtime prompts...",
  });
  try {
    await runStage5(ipId, sceneGraph.scenes, blueprints, characterCards);
    onProgress({
      stage: "stage5",
      status: "complete",
      message: "Runtime prompts assembled",
    });
  } catch (err) {
    onProgress({
      stage: "stage5",
      status: "error",
      message: `Stage 5 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // Stage 6: Share Templates
  onProgress({
    stage: "stage6",
    status: "running",
    message: "Generating share templates...",
  });
  try {
    await runStage6(
      ipId,
      ipProfile,
      sceneGraph,
      sceneVisuals,
      socialMechanics
    );
    onProgress({
      stage: "stage6",
      status: "complete",
      message: "Share templates generated",
    });
  } catch (err) {
    onProgress({
      stage: "stage6",
      status: "error",
      message: `Stage 6 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // Done
  onProgress({
    stage: "done",
    status: "complete",
    message: `Pipeline complete! IP: ${ipId}, Scenes: ${sceneGraph.scenes.length}, Characters: ${characterCards.length}`,
    data: { ipId, sceneCount: sceneGraph.scenes.length },
  });

  return { ipId, ipProfile, sceneGraph, blueprints };
}

import { ensureDirectories } from "../data/storage";
import { runStage1 } from "./stage1-ip-parser";
import { runStage2 } from "./stage2-scene-decomposer";
import { runStage3A } from "./stage3a-character-cards";
import { runStage3B } from "./stage3b-visual-scenes";
import { runStage3C } from "./stage3c-social-mechanics";
import { runStage4 } from "./stage4-blueprint-assembler";
import { runStage5 } from "./stage5-runtime-prompt";
import { runStage6 } from "./stage6-social-output";
import type {
  PipelineInput,
  PipelineProgress,
  IPProfile,
  SceneGraph,
  CharacterCard,
  VisualScene,
  SocialMechanics,
} from "@/types";

type ProgressCallback = (progress: PipelineProgress) => void;

export async function runPipeline(
  input: PipelineInput,
  onProgress: ProgressCallback
) {
  const ipId = input.ip_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // Create directory structure
  await ensureDirectories(ipId);

  // ====== Stage 1: IP Parser ======
  onProgress({ stage: "stage1", status: "running", message: "Analyzing IP..." });
  let ipProfile: IPProfile;
  try {
    ipProfile = await runStage1(
      ipId,
      input.novel_text,
      input.ip_name,
      input.target_market,
      input.social_preferences
    );

    // Ensure characters array exists
    if (!ipProfile.characters) ipProfile.characters = [];
    if (!Array.isArray(ipProfile.characters)) {
      console.error("[Stage1] characters is not an array:", typeof ipProfile.characters);
      ipProfile.characters = [];
    }

    // Ensure iconic_scenes array exists
    if (!ipProfile.iconic_scenes) ipProfile.iconic_scenes = [];

    onProgress({
      stage: "stage1",
      status: "complete",
      message: `IP parsed: ${ipProfile.title || input.ip_name} (${ipProfile.characters.length} characters)`,
    });
  } catch (err) {
    onProgress({
      stage: "stage1",
      status: "error",
      message: `Stage 1 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // ====== Stage 2: Scene Decomposer ======
  onProgress({ stage: "stage2", status: "running", message: "Designing interactive scenes..." });
  let sceneGraph: SceneGraph;
  try {
    sceneGraph = await runStage2(ipId, ipProfile);

    // Ensure scenes array exists
    if (!sceneGraph.scenes) sceneGraph.scenes = [];
    if (!Array.isArray(sceneGraph.scenes)) {
      console.error("[Stage2] scenes is not an array:", typeof sceneGraph.scenes);
      sceneGraph.scenes = [];
    }

    // Ensure each scene has characters_involved array
    for (const scene of sceneGraph.scenes) {
      if (!scene.characters_involved) scene.characters_involved = [];
    }

    const sceneCount = sceneGraph.scenes.length;
    onProgress({
      stage: "stage2",
      status: "complete",
      message: `${sceneCount} scenes designed`,
    });

    if (sceneCount === 0) {
      throw new Error("No scenes were generated. The AI may not have enough content to work with.");
    }
  } catch (err) {
    onProgress({
      stage: "stage2",
      status: "error",
      message: `Stage 2 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    throw err;
  }

  // ====== Stage 3: Parallel Generation ======
  onProgress({ stage: "stage3a", status: "running", message: "Generating character cards..." });
  onProgress({ stage: "stage3b", status: "running", message: "Generating visual scenes..." });
  onProgress({ stage: "stage3c", status: "running", message: "Designing social mechanics..." });

  let characterCards: CharacterCard[] = [];
  let sceneVisuals: VisualScene[] = [];
  let socialMechanics: SocialMechanics = { scenes: [] };

  // Run in parallel but don't let one failure kill the others
  const results = await Promise.allSettled([
    runStage3A(ipId, ipProfile, sceneGraph).then((result) => {
      characterCards = result || [];
      onProgress({
        stage: "stage3a",
        status: "complete",
        message: `${characterCards.length} character cards generated`,
      });
    }),
    runStage3B(ipId, ipProfile, sceneGraph).then((result) => {
      sceneVisuals = result || [];
      onProgress({
        stage: "stage3b",
        status: "complete",
        message: `${sceneVisuals.length} visual scenes generated`,
      });
    }),
    runStage3C(ipId, sceneGraph).then((result) => {
      socialMechanics = result || { scenes: [] };
      if (!socialMechanics.scenes) socialMechanics.scenes = [];
      onProgress({
        stage: "stage3c",
        status: "complete",
        message: "Social mechanics designed",
      });
    }),
  ]);

  // Log failures but continue
  const stageNames = ["stage3a", "stage3b", "stage3c"];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const reason = (results[i] as PromiseRejectedResult).reason;
      console.error(`[${stageNames[i]}] Failed:`, reason);
      onProgress({
        stage: stageNames[i],
        status: "error",
        message: `Failed: ${reason instanceof Error ? reason.message : "Unknown error"}`,
      });
    }
  }

  // ====== Stage 4: Blueprint Assembly ======
  onProgress({ stage: "stage4", status: "running", message: "Assembling blueprints..." });
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

  // ====== Stage 5: Runtime Prompts (code-based, no AI) ======
  onProgress({ stage: "stage5", status: "running", message: "Assembling runtime prompts..." });
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
    // Non-fatal, continue
  }

  // ====== Stage 6: Share Templates ======
  onProgress({ stage: "stage6", status: "running", message: "Generating share templates..." });
  try {
    await runStage6(ipId, ipProfile, sceneGraph, sceneVisuals, socialMechanics);
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
    // Non-fatal, continue
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

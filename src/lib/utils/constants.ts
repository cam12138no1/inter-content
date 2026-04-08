export const TIER_CONFIG = {
  1: {
    label: "Tier 1",
    description: "Pure frontend, zero AI tokens",
    maxTurns: 0,
    maxReplyChars: 0,
    estimatedTokens: 0,
    requiresAI: false,
  },
  1.5: {
    label: "Tier 1.5",
    description: "3-5 turn limited dialogue",
    maxTurns: 5,
    maxReplyChars: 80,
    estimatedTokens: 3000,
    requiresAI: true,
  },
  2: {
    label: "Tier 2",
    description: "Up to 15 turn free dialogue",
    maxTurns: 15,
    maxReplyChars: 150,
    estimatedTokens: 20000,
    requiresAI: true,
  },
} as const;

export const SCENE_TYPES = {
  tier1: [
    "identity_test",
    "timed_challenge",
    "moral_dilemma",
    "story_slideshow",
  ],
  tier1_5: ["guided_dialogue", "negotiation"],
  tier2: ["free_roleplay", "branching_story"],
} as const;

export const SOCIAL_FORMATS = [
  "identity_card",
  "score_leaderboard",
  "dialogue_screenshot",
  "friend_comparison",
  "story_summary",
] as const;

export const PIPELINE_STAGES = [
  { id: "stage1", name: "IP Parser", description: "Analyzing novel/IP" },
  {
    id: "stage2",
    name: "Scene Decomposer",
    description: "Designing interactive scenes",
  },
  {
    id: "stage3a",
    name: "Character Cards",
    description: "Creating AI character personas",
  },
  {
    id: "stage3b",
    name: "Visual Scenes",
    description: "Generating image prompts",
  },
  {
    id: "stage3c",
    name: "Social Mechanics",
    description: "Designing share mechanisms",
  },
  {
    id: "stage4",
    name: "Blueprint Assembly",
    description: "Assembling executable blueprints",
  },
  {
    id: "stage5",
    name: "Runtime Prompts",
    description: "Assembling dialogue prompts",
  },
  {
    id: "stage6",
    name: "Share Templates",
    description: "Generating share card templates",
  },
] as const;

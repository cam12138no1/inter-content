export const MODEL_CONFIG = {
  // Pipeline generation stages — strong logic and long output
  pipeline: {
    model: "anthropic/claude-sonnet-4",
    maxTokens: 4096,
    temperature: 0.6,
  },

  // Tier 1.5 runtime dialogue — role-play quality, cost-sensitive
  runtime_tier15: {
    model: "anthropic/claude-sonnet-4",
    maxTokens: 300,
    temperature: 0.6,
  },

  // Tier 2 runtime dialogue — highest quality
  runtime_tier2: {
    model: "anthropic/claude-sonnet-4",
    maxTokens: 500,
    temperature: 0.8,
  },

  // Image generation
  image_gen: {
    model: "openai/gpt-image-1",
  },
} as const;

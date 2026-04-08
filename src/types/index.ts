// ============ IP Profile (Stage 1 Output) ============

export interface IPProfile {
  title: string;
  title_short: string;
  genre_tags: string[];
  origin: string;
  target_audience: string;

  tone: {
    primary: string;
    secondary: string;
    emotional_range: string[];
  };

  world_rules: {
    system_name: string;
    core_mechanic: string;
    power_system: string;
    one_sentence: string;
    setting_period: string;
  };

  characters: Character[];

  iconic_scenes: IconicScene[];

  remix_surfaces: RemixSurface[];

  social_potential_score: {
    identity_test_fit: number;
    challenge_fit: number;
    confession_fit: number;
    friend_comparison_fit: number;
    overall: string;
    best_social_format: string;
  };
}

export interface Character {
  char_id: string;
  name: string;
  role: string;
  one_line: string;
  visual_keywords: string;
  speech_style: string;
  social_appeal: string;
  relationships: Record<string, string>;
}

export interface IconicScene {
  scene_name: string;
  why_iconic: string;
  visual_impact: "high" | "medium" | "low";
  choice_density: "high" | "medium" | "low";
  social_potential: {
    identity_test: string | null;
    challenge: string | null;
    share_hook: string;
  };
}

export interface RemixSurface {
  surface_id: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  example: string;
}

// ============ Scene Graph (Stage 2 Output) ============

export interface SceneGraph {
  ip_id: string;
  total_scenes: number;
  tier_distribution: { tier1: number; tier1_5: number; tier2: number };
  scenes: Scene[];
}

export interface Scene {
  scene_id: string;
  scene_title: string;
  tier: 1 | 1.5 | 2;
  scene_type: string;
  duration: string;
  social_format: string;
  unlock_condition: string | null;
  characters_involved: string[];

  hook: {
    text: string;
    visual_hint: string;
  };

  interaction_flow: InteractionStep[];

  result_logic: {
    method: string;
    results: Record<string, SceneResult>;
  };

  share_exit: {
    primary_cta: string;
    share_text_template: string;
    friend_comparison: boolean;
    comparison_text: string;
    leaderboard: string;
  };

  remix_params: RemixParam[];

  return_hook: {
    type: string;
    message: string;
  };

  transition_to: string | null;
}

export interface InteractionStep {
  step_id: string;
  type: string;
  timer_seconds: number | null;
  prompt: string;
  options?: StepOption[];
  visual_hint: string;
}

export interface StepOption {
  id: string;
  text: string;
  tags: string[];
  scoring: string;
}

export interface SceneResult {
  condition: string;
  title: string;
  subtitle: string;
  description: string;
  matching_character: string | null;
  visual_hint: string;
}

export interface RemixParam {
  param: string;
  default: string;
  user_can_change: boolean;
  change_type: string;
  example: string;
}

// ============ Character Card (Stage 3A Output) ============

export interface CharacterCard {
  char_id: string;
  display_name: string;
  tier_1_5_system_prompt: string;
  tier_2_system_prompt: string;

  personality_matrix: {
    core_traits: string[];
    values: string;
    fears: string;
    desires: string;
  };

  speech_rules: {
    sentence_length: string;
    emotional_expression: string;
    humor_style: string;
    formality: string;
    typical_phrases: string[];
    never_says: string[];
    language_quirks: string;
  };

  trust_system: {
    initial_level: number;
    range: [number, number];
    positive_triggers: Record<string, string>;
    negative_triggers: Record<string, string>;
    level_behaviors: Record<string, string>;
  };

  image_emotion_map: Record<string, string>;

  knowledge_boundary: {
    knows: string[];
    does_not_know: string[];
    suspects: string[];
  };
}

// ============ Visual Scene (Stage 3B Output) ============

export interface VisualScene {
  scene_id: string;
  global_art_style: string;

  pregenerated_images: PregenImage[];

  dynamic_templates: {
    base_template: string;
    variables: Record<string, Record<string, string>>;
  };

  character_portraits: Record<
    string,
    {
      base_appearance: string;
      emotion_modifiers: Record<string, string>;
    }
  >;

  share_card_backgrounds: ShareCardBackground[];
}

export interface PregenImage {
  image_id: string;
  trigger: string;
  prompt: string;
  negative_prompt: string;
  aspect_ratio: string;
}

export interface ShareCardBackground {
  card_type: string;
  prompt: string;
  color_palette: string[];
  text_safe_zone: string;
}

// ============ Social Mechanics (Stage 3C Output) ============

export interface SocialMechanics {
  scenes: SceneSocial[];
}

export interface SceneSocial {
  scene_id: string;

  viral_loop: {
    step_1_complete: string;
    step_2_share: string;
    step_3_friend_enters: string;
    step_4_friend_completes: string;
    step_5_loop: string;
    estimated_k_factor: string;
    friction_points: string;
    friction_fix: string;
  };

  share_assets: ShareAsset[];

  friend_comparison: {
    enabled: boolean;
    dimensions: string[];
    compatibility_score: {
      enabled: boolean;
      display: string;
      formula_hint: string;
    };
    verdicts: Record<string, string>;
  };

  leaderboard: {
    type: string;
    metric: string;
    scope: string;
    display_count: number;
    hook: string;
  };

  return_hooks: ReturnHook[];
}

export interface ShareAsset {
  asset_type: string;
  trigger: string;
  contains: string[];
  cta_text: string;
  share_copy: Record<string, string>;
}

export interface ReturnHook {
  type: string;
  trigger: string;
  message: string;
  delivery: string;
}

// ============ Blueprint (Stage 4 Output) ============

export interface Blueprint {
  scene_id: string;
  tier: 1 | 1.5 | 2;
  scene_type: string;
  duration: string;
  estimated_token_cost_per_play: string;

  frontend_spec: {
    layout: string;
    entry_animation: string;
    background_image_ref: string;
    accent_color: string;
  };

  interaction_sequence: SequenceStep[];

  state_machine: {
    variables: Record<string, { type: string; initial: unknown }>;
    update_rules: UpdateRule[];
    result_computation: {
      method: string;
      logic: string;
    };
    exit_conditions: ExitCondition[];
  };

  social_integration: {
    share_card_template_ref: string;
    leaderboard_metric: string;
    friend_comparison_fields: string[];
    viral_entry_behavior: string;
  };
}

export interface SequenceStep {
  seq_id: number;
  action: string;
  content: Record<string, unknown>;
  requires_ai: boolean;
  ai_config?: {
    model: string;
    max_tokens: number;
    temperature: number;
    output_format: string;
  };
  next: number | Record<string, number> | null;
}

export interface UpdateRule {
  trigger: string;
  action: string;
}

export interface ExitCondition {
  condition: string;
  result: string;
  next: string;
}

// ============ Share Config (Stage 6 Output) ============

export interface ShareConfig {
  scenes: SceneShareConfig[];
}

export interface SceneShareConfig {
  scene_id: string;

  cards: ShareCardTemplate[];

  share_copy: Record<
    string,
    {
      text: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    }
  >;
}

export interface ShareCardTemplate {
  card_type: string;
  size: string;
  layout: ShareCardZone[];
  color_scheme: {
    background: string;
    primary_text: string;
    secondary_text: string;
    accent: string;
  };
  dynamic_fields: Record<
    string,
    {
      source: string;
      fallback: string;
    }
  >;
  background_image_ref: string | null;
}

export interface ShareCardZone {
  zone: string;
  y_percent: [number, number];
  content_source: string;
  style: {
    font_size: string;
    font_weight: string;
    color: string;
    align: string;
  };
}

// ============ Chat Types ============

export interface ChatRequest {
  ip_id: string;
  scene_id: string;
  user_message: string;
  conversation_history: ChatMessage[];
  current_state: GameState;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GameState {
  trust: number;
  suspicion: number;
  turn: number;
  [key: string]: unknown;
}

export interface AIResponse {
  reply: string;
  suggested_responses: string[];
  emotion: string;
  trust_delta: number;
  turn: number;
  is_final: boolean;
  image_hint: string | null;
  should_generate_image?: boolean;
  image_prompt?: string;
  suspicion_delta?: number;
}

export interface ChatResponse {
  ai_response: AIResponse;
  new_state: GameState;
  scene_exit: ExitCondition | null;
  generated_image_url: string | null;
}

// ============ Pipeline Types ============

export interface PipelineInput {
  novel_text: string;
  ip_name: string;
  target_market: string;
  social_preferences: string[];
}

export interface PipelineProgress {
  stage: string;
  status: "running" | "complete" | "error";
  message: string;
  data?: unknown;
}

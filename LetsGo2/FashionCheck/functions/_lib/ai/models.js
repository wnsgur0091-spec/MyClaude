export const AI_FEATURES = Object.freeze({
  OUTFIT_ANALYSIS: 'outfitAnalysis',
  STYLE_EDIT: 'styleEdit',
});

const MODEL_REGISTRY = Object.freeze({
  'gemini-3.1-flash-lite': {
    provider: 'gemini',
    capabilities: [AI_FEATURES.OUTFIT_ANALYSIS],
  },
  'gemini-3.5-flash': {
    provider: 'gemini',
    capabilities: [AI_FEATURES.OUTFIT_ANALYSIS],
  },
  '@cf/black-forest-labs/flux-2-klein-4b': {
    provider: 'cloudflare-workers-ai',
    capabilities: [AI_FEATURES.STYLE_EDIT],
  },
  '@cf/black-forest-labs/flux-2-klein-9b': {
    provider: 'cloudflare-workers-ai',
    capabilities: [AI_FEATURES.STYLE_EDIT],
  },
  '@cf/black-forest-labs/flux-2-dev': {
    provider: 'cloudflare-workers-ai',
    capabilities: [AI_FEATURES.STYLE_EDIT],
  },
});

const FEATURE_CONFIG = Object.freeze({
  [AI_FEATURES.OUTFIT_ANALYSIS]: {
    environmentKey: 'AI_OUTFIT_ANALYSIS_MODEL',
    defaultModel: 'gemini-3.1-flash-lite',
  },
  [AI_FEATURES.STYLE_EDIT]: {
    environmentKey: 'AI_STYLE_EDIT_MODEL',
    defaultModel: '@cf/black-forest-labs/flux-2-klein-4b',
  },
});

export function resolveAiModel(feature, env) {
  const featureConfig = FEATURE_CONFIG[feature];
  if (!featureConfig) throw new Error(`Unsupported AI feature: ${feature}`);

  const modelId = env[featureConfig.environmentKey] || featureConfig.defaultModel;
  const model = MODEL_REGISTRY[modelId];
  if (!model || !model.capabilities.includes(feature)) {
    throw new Error(`Model '${modelId}' is not registered for '${feature}'.`);
  }

  return { id: modelId, provider: model.provider };
}

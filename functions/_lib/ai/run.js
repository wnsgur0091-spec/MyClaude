import { runGemini } from './providers/gemini.js';
import { runWorkersAiImageEdit } from './providers/workers-ai.js';

const PROVIDERS = Object.freeze({
  gemini: runGemini,
  'cloudflare-workers-ai': runWorkersAiImageEdit,
});

export async function runAiModel(model, env, input) {
  const provider = PROVIDERS[model.provider];
  if (!provider) throw new Error(`Unsupported AI provider: ${model.provider}`);
  return provider({ modelId: model.id, env, input });
}

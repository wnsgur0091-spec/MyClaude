import { AI_ERROR_CODES, AiConfigurationError, AiProviderError } from '../errors.js';

export async function runWorkersAiImageEdit({ modelId, env, input }) {
  if (!env.AI) throw new AiConfigurationError("Workers AI binding 'AI' is not configured.");

  const form = new FormData();
  form.append('prompt', input.prompt);
  form.append('input_image_0', input.image, 'outfit.jpg');
  form.append('width', String(input.width));
  form.append('height', String(input.height));

  const serialized = new Response(form);
  try {
    return await env.AI.run(modelId, {
      multipart: {
        body: serialized.body,
        contentType: serialized.headers.get('content-type'),
      },
    });
  } catch (error) {
    console.error('Workers AI image edit failed', error instanceof Error ? error.message : error);
    const details = `${error?.message || ''} ${error?.cause?.message || ''}`;
    const quotaExceeded = error?.status === 429 || /3036|quota|allocation|rate.?limit/i.test(details);
    const safetyBlocked = /safety|moderation|unsafe|content.?policy/i.test(details);
    const code = quotaExceeded
      ? AI_ERROR_CODES.QUOTA_EXCEEDED
      : safetyBlocked
        ? AI_ERROR_CODES.SAFETY_BLOCKED
        : AI_ERROR_CODES.TEMPORARY_UNAVAILABLE;
    throw new AiProviderError('Image editing failed.', quotaExceeded ? 429 : safetyBlocked ? 422 : 503, code);
  }
}

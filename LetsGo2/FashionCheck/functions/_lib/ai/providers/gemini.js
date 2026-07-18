import { AI_ERROR_CODES, AiConfigurationError, AiProviderError } from '../errors.js';

export async function runGemini({ modelId, env, input }) {
  if (!env.GEMINI_API_KEY) throw new AiConfigurationError('GEMINI_API_KEY is not configured.');

  let response = await requestGemini(modelId, env.GEMINI_API_KEY, input);

  // Some generateContent deployments still reject the newer responseFormat field.
  // Retry once with the broadly supported JSON MIME mode; the server validates the result.
  if (response.status === 400 && input?.generationConfig?.responseFormat) {
    console.warn('Gemini structured response format was rejected; retrying with JSON MIME mode.');
    response = await requestGemini(modelId, env.GEMINI_API_KEY, toJsonMimeInput(input));
  }

  if (!response.ok) {
    console.error('Gemini request failed', response.status, await response.text());
    const code = response.status === 429
      ? AI_ERROR_CODES.QUOTA_EXCEEDED
      : AI_ERROR_CODES.TEMPORARY_UNAVAILABLE;
    throw new AiProviderError('Gemini analysis failed.', response.status, code);
  }
  return response.json();
}

function requestGemini(modelId, apiKey, input) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(input),
  });
}

function toJsonMimeInput(input) {
  const { responseFormat: _responseFormat, ...generationConfig } = input.generationConfig;
  return {
    ...input,
    generationConfig: {
      ...generationConfig,
      responseMimeType: 'application/json',
    },
  };
}

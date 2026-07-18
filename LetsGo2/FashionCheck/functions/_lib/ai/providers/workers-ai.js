import { AI_ERROR_CODES, AiConfigurationError, AiProviderError } from '../errors.js';

const COLD_START_RETRY_DELAY_MS = 900;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runWorkersAiImageEdit({ modelId, env, input }) {
  if (!env.AI) throw new AiConfigurationError("Workers AI binding 'AI' is not configured.");

  const form = new FormData();
  form.append('prompt', input.prompt);
  form.append('input_image_0', input.image, 'outfit.jpg');
  form.append('width', String(input.width));
  form.append('height', String(input.height));

  const serialized = new Response(form);
  const runOnce = () => env.AI.run(modelId, {
    multipart: {
      body: serialized.body,
      contentType: serialized.headers.get('content-type'),
    },
  });

  try {
    return await runOnce();
  } catch (firstError) {
    const classification = classifyError(firstError);
    // 콜드 스타트(모델이 처음 로드될 때) 타임아웃으로 첫 시도가 실패하는 경우가 잦아서,
    // 일시적 오류(할당량 초과/안전 차단이 아닌 경우)에 한해 한 번만 재시도한다.
    if (classification.quotaExceeded || classification.safetyBlocked) {
      throwProviderError(classification);
    }
    console.warn('Workers AI image edit failed once, retrying (possible cold start)', firstError instanceof Error ? firstError.message : firstError);
    await sleep(COLD_START_RETRY_DELAY_MS);
    try {
      return await runOnce();
    } catch (secondError) {
      console.error('Workers AI image edit failed after retry', secondError instanceof Error ? secondError.message : secondError);
      throwProviderError(classifyError(secondError));
    }
  }
}

function classifyError(error) {
  const details = `${error?.message || ''} ${error?.cause?.message || ''}`;
  const quotaExceeded = error?.status === 429 || /3036|quota|allocation|rate.?limit/i.test(details);
  const safetyBlocked = /safety|moderation|unsafe|content.?policy/i.test(details);
  return { quotaExceeded, safetyBlocked };
}

function throwProviderError({ quotaExceeded, safetyBlocked }) {
  const code = quotaExceeded
    ? AI_ERROR_CODES.QUOTA_EXCEEDED
    : safetyBlocked
      ? AI_ERROR_CODES.SAFETY_BLOCKED
      : AI_ERROR_CODES.TEMPORARY_UNAVAILABLE;
  throw new AiProviderError('Image editing failed.', quotaExceeded ? 429 : safetyBlocked ? 422 : 503, code);
}

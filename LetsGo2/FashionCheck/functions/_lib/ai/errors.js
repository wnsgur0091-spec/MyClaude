export const AI_ERROR_CODES = Object.freeze({
  CONFIGURATION: 'AI_CONFIGURATION',
  QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  SAFETY_BLOCKED: 'AI_SAFETY_BLOCKED',
  TEMPORARY_UNAVAILABLE: 'AI_TEMPORARY_UNAVAILABLE',
  INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
});

export class AiConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.code = AI_ERROR_CODES.CONFIGURATION;
    this.status = 503;
  }
}

export class AiProviderError extends Error {
  constructor(message, status = 502, code = AI_ERROR_CODES.TEMPORARY_UNAVAILABLE) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class AiSafetyError extends AiProviderError {
  constructor(message = 'The AI provider blocked this image for safety reasons.') {
    super(message, 422, AI_ERROR_CODES.SAFETY_BLOCKED);
  }
}

export function toPublicAiError(error) {
  const code = Object.values(AI_ERROR_CODES).includes(error?.code)
    ? error.code
    : AI_ERROR_CODES.TEMPORARY_UNAVAILABLE;

  const responses = {
    [AI_ERROR_CODES.CONFIGURATION]: ['AI 기능이 아직 설정되지 않았습니다.', 503],
    [AI_ERROR_CODES.QUOTA_EXCEEDED]: ['오늘의 무료 AI 사용량을 모두 사용했습니다. 내일 다시 시도해 주세요.', 429],
    [AI_ERROR_CODES.SAFETY_BLOCKED]: ['안전 정책상 이 사진은 처리할 수 없습니다. 다른 사진으로 시도해 주세요.', 422],
    [AI_ERROR_CODES.INVALID_RESPONSE]: ['AI 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502],
    [AI_ERROR_CODES.TEMPORARY_UNAVAILABLE]: ['AI 서비스가 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.', 503],
  };
  const [message, status] = responses[code];
  return { code, message, status };
}

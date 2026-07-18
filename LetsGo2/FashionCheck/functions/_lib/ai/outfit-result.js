const MATCH_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    keyword: { type: 'string' },
    x: { type: 'integer', minimum: 0, maximum: 100 },
    y: { type: 'integer', minimum: 0, maximum: 100 },
  },
  required: ['name', 'keyword', 'x', 'y'],
});

const EDIT_REGION_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    x: { type: 'integer', minimum: 0, maximum: 100 },
    y: { type: 'integer', minimum: 0, maximum: 100 },
    width: { type: 'integer', minimum: 1, maximum: 100 },
    height: { type: 'integer', minimum: 1, maximum: 100 },
  },
  required: ['x', 'y', 'width', 'height'],
});

const RECOMMENDATION_ITEM_TYPES = Object.freeze([
  'clothing',
  'bag',
  'belt',
  'shoes',
  'watch',
  'fashion-accessory',
  'unsupported-accessory',
]);

const WORST_MATCH_SCHEMA = Object.freeze({
  ...MATCH_SCHEMA,
  properties: {
    ...MATCH_SCHEMA.properties,
    recommendItem: { type: 'string' },
    recommendReason: { type: 'string' },
    itemType: { type: 'string', enum: RECOMMENDATION_ITEM_TYPES },
    editRegion: EDIT_REGION_SCHEMA,
    reasonTags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 3,
    },
  },
  required: [...MATCH_SCHEMA.required, 'recommendItem', 'recommendReason', 'itemType', 'editRegion', 'reasonTags'],
});

export const OUTFIT_RESULT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 10000 },
    tier: { type: 'string' },
    roast: { type: 'string' },
    bestMatches: { type: 'array', items: MATCH_SCHEMA, minItems: 1, maxItems: 1 },
    worstMatches: { type: 'array', items: WORST_MATCH_SCHEMA, minItems: 1, maxItems: 3 },
    musinsaQuery: { type: 'string' },
    improvementSummary: { type: 'string' },
    editAccepted: { type: 'boolean' },
    comparisonSummary: { type: 'string' },
    stats: {
      type: 'object',
      additionalProperties: { type: 'integer', minimum: 0, maximum: 100 },
    },
  },
  required: ['score', 'tier', 'roast', 'bestMatches', 'worstMatches', 'musinsaQuery', 'stats'],
});

const STAT_KEYS_BY_TPO = Object.freeze({
  '일상': ['색상 불협화음 🎨', '안구 보호도 👁️', '근자감 농도 ⚡', '지갑 방어력 💸', '마실 적합도 ☕'],
  '데이트': ['설렘 유발 지수 💘', '과도한 격식도 🕴️', '센스 스포일러 🕶️', '호감도 파괴력 💔', '데이트 생존율 🧬'],
  '출근': ['부장님 눈총 지수 😒', '프로페셔널 지수 💼', '활동성 방해율 🏃', '퇴근 본능 자극도 ⏰', '평판 수호 지수 🛡️'],
  '운동': ['헬창 아우라 지수 🏋️', '거울 셀카 득표율 📸', '땀 배출 지연도 💦', '신체 보정 치트 📐', '근손실 위장도 🧬'],
  '하객': ['신부 저격 민폐도 🏹', '하객 격식 비율 🤝', '사진 생존율 📸', '피로연 프리패스 🍽️', '친척 잔소리 실드 🛡️'],
});

export function getStatKeysForTpo(tpo) {
  return STAT_KEYS_BY_TPO[tpo] || [];
}

export function parseOutfitResult(response, tpo, options = {}) {
  const candidate = response?.candidates?.[0];
  const blocked = candidate?.finishReason === 'SAFETY'
    || response?.promptFeedback?.blockReason === 'SAFETY';
  if (blocked) throw new AiSafetyError();
  if (!candidate?.content?.parts) throw invalidResponse('Gemini returned no usable candidate.');

  const responseText = candidate.content.parts
    .filter((part) => typeof part?.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();

  if (!responseText) throw invalidResponse('Gemini returned an empty response.');

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw invalidResponse('Gemini returned invalid JSON.');
  }

  const normalized = normalizeOutfitResult(result, tpo);
  validateOutfitResult(normalized, options);
  return normalized;
}

function normalizeOutfitResult(result, tpo) {
  if (!result || typeof result !== 'object') return result;

  const normalizeMatch = (match, withRecommendation = false) => {
    if (!match || typeof match !== 'object') return null;

    const name = cleanText(match.name);
    let keyword = cleanText(match.keyword);
    if (!keyword && name) {
      const namePart = cleanText(name.split(':')[0]);
      const words = namePart.split(/\s+/);
      keyword = words.slice(-2).join(' ') || namePart;
    }
    if (!keyword) {
      keyword = withRecommendation ? '추천 아이템' : '베스트 아이템';
    }

    const normalized = {
      name,
      keyword,
      x: boundedInteger(match.x, 0, 100),
      y: boundedInteger(match.y, 0, 100),
    };
    if (withRecommendation) {
      normalized.recommendItem = cleanText(match.recommendItem);
      normalized.recommendReason = cleanText(match.recommendReason)
        || `${normalized.recommendItem} 하나면 코디 밸런스가 제자리로 돌아옵니다. 패션 구조대 출동 완료!`;
      normalized.itemType = RECOMMENDATION_ITEM_TYPES.includes(match.itemType)
        ? match.itemType
        : 'clothing';
      normalized.editRegion = {
        x: boundedInteger(match.editRegion?.x, 0, 100),
        y: boundedInteger(match.editRegion?.y, 0, 100),
        width: boundedInteger(match.editRegion?.width, 1, 100),
        height: boundedInteger(match.editRegion?.height, 1, 100),
      };
      const tags = Array.isArray(match.reasonTags)
        ? match.reasonTags.map(cleanText).filter(Boolean).slice(0, 3)
        : [];
      normalized.reasonTags = tags.length ? tags : ['스타일개선', '추천아이템'];
    }
    return normalized;
  };

  const bestSource = Array.isArray(result.bestMatches)
    ? result.bestMatches
    : result.bestMatch ? [result.bestMatch] : [];
  const worstSource = Array.isArray(result.worstMatches)
    ? result.worstMatches
    : result.worstMatch ? [result.worstMatch] : [];
  const allowedStatKeys = getStatKeysForTpo(tpo);
  const providedStats = new Map(Object.entries(result.stats || {}).map(([name, value]) => [
    comparableStatKey(name),
    value,
  ]));
  const stats = Object.fromEntries(allowedStatKeys.map((name) => [
    name,
    boundedInteger(providedStats.get(comparableStatKey(name)), 0, 100),
  ]));

  const worstMatches = worstSource.map((match) => normalizeMatch(match, true)).filter(Boolean).slice(0, 4);
  return {
    score: boundedInteger(result.score, 0, 10000),
    tier: cleanText(result.tier),
    roast: cleanText(result.roast),
    bestMatches: bestSource.map((match) => normalizeMatch(match)).filter(Boolean).slice(0, 1),
    worstMatches: worstMatches.slice(0, 3),
    musinsaQuery: cleanText(result.musinsaQuery) || worstMatches[0]?.recommendItem || '',
    improvementSummary: cleanText(result.improvementSummary),
    editAccepted: typeof result.editAccepted === 'boolean' ? result.editAccepted : null,
    comparisonSummary: cleanText(result.comparisonSummary),
    stats,
  };
}

function validateOutfitResult(result, { requireEditDecision = false } = {}) {
  const isIntegerInRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const isNonEmptyText = (value) => typeof value === 'string' && value.trim().length > 0;
  const isMatch = (value, withRecommendation = false) => value
    && isNonEmptyText(value.name)
    && isNonEmptyText(value.keyword)
    && isIntegerInRange(value.x, 0, 100)
    && isIntegerInRange(value.y, 0, 100)
    && (!withRecommendation || (
      isNonEmptyText(value.recommendItem)
      && isNonEmptyText(value.recommendReason)
      && RECOMMENDATION_ITEM_TYPES.includes(value.itemType)
      && value.editRegion
      && isIntegerInRange(value.editRegion.x, 0, 100)
      && isIntegerInRange(value.editRegion.y, 0, 100)
      && isIntegerInRange(value.editRegion.width, 1, 100)
      && isIntegerInRange(value.editRegion.height, 1, 100)
    ));
  const stats = result?.stats && Object.entries(result.stats);

  const valid = result
    && isIntegerInRange(result.score, 0, 10000)
    && isNonEmptyText(result.tier)
    && isNonEmptyText(result.roast)
    && Array.isArray(result.bestMatches)
    && result.bestMatches.length >= 1
    && result.bestMatches.length === 1
    && result.bestMatches.every((match) => isMatch(match))
    && Array.isArray(result.worstMatches)
    && result.worstMatches.length >= 1
    && result.worstMatches.length <= 3
    && result.worstMatches.every((match) => isMatch(match, true)
      && Array.isArray(match.reasonTags)
      && match.reasonTags.length >= 1
      && match.reasonTags.every(isNonEmptyText))
    && isNonEmptyText(result.musinsaQuery)
    && (!requireEditDecision || typeof result.editAccepted === 'boolean')
    && Array.isArray(stats)
    && stats.length === 5
    && stats.every(([name, score]) => isNonEmptyText(name) && isIntegerInRange(score, 0, 100));

  if (!valid) throw invalidResponse('Gemini response failed outfit-result validation.');
}

function invalidResponse(message) {
  return new AiProviderError(message, 502, AI_ERROR_CODES.INVALID_RESPONSE);
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function comparableStatKey(value) {
  return cleanText(value).normalize('NFKC').replaceAll('\uFE0F', '');
}

function boundedInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  return Math.max(min, Math.min(max, Math.round(number)));
}
import { AI_ERROR_CODES, AiProviderError, AiSafetyError } from './errors.js';

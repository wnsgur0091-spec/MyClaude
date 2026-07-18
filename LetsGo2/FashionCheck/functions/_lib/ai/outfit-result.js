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

const WORST_MATCH_SCHEMA = Object.freeze({
  ...MATCH_SCHEMA,
  properties: {
    ...MATCH_SCHEMA.properties,
    recommendItem: { type: 'string' },
    reasonTags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 3,
    },
  },
  required: [...MATCH_SCHEMA.required, 'recommendItem'],
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
    stats: {
      type: 'object',
      additionalProperties: { type: 'integer', minimum: 0, maximum: 100 },
    },
  },
  required: ['score', 'tier', 'roast', 'bestMatches', 'worstMatches', 'musinsaQuery', 'stats'],
});

export function parseOutfitResult(response) {
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

  const normalized = normalizeOutfitResult(result);
  validateOutfitResult(normalized);
  return normalized;
}

function normalizeOutfitResult(result) {
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
  const stats = Object.fromEntries(Object.entries(result.stats || {}).slice(0, 5).map(([name, value]) => [
    cleanText(name),
    boundedInteger(value, 0, 100),
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
    stats,
  };
}

function validateOutfitResult(result) {
  const isIntegerInRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const isNonEmptyText = (value) => typeof value === 'string' && value.trim().length > 0;
  const isMatch = (value, withRecommendation = false) => value
    && isNonEmptyText(value.name)
    && isNonEmptyText(value.keyword)
    && isIntegerInRange(value.x, 0, 100)
    && isIntegerInRange(value.y, 0, 100)
    && (!withRecommendation || isNonEmptyText(value.recommendItem));
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
    && Array.isArray(stats)
    && stats.length === 5
    && stats.every(([name, score]) => isNonEmptyText(name) && isIntegerInRange(score, 0, 100));

  if (!valid) {
    console.error('Validation failed. Normalized result:', JSON.stringify(result, null, 2));
    throw invalidResponse('Gemini response failed outfit-result validation.');
  }
}

function invalidResponse(message) {
  return new AiProviderError(message, 502, AI_ERROR_CODES.INVALID_RESPONSE);
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function boundedInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  return Math.max(min, Math.min(max, Math.round(number)));
}
import { AI_ERROR_CODES, AiProviderError, AiSafetyError } from './errors.js';

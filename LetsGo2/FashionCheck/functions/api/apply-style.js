import { AI_FEATURES, resolveAiModel } from '../_lib/ai/models.js';
import { runAiModel } from '../_lib/ai/run.js';
import { base64ToBlob, json, parseDataUrl } from '../_lib/http.js';
import { toPublicAiError } from '../_lib/ai/errors.js';

const MAX_TEXT_LENGTH = 500;
const EDITABLE_ITEM_TYPES = new Set(['clothing', 'bag', 'belt', 'shoes', 'watch', 'fashion-accessory']);
const BLOCKED_ACCESSORY_PATTERN = /(귀걸이|이어링|earrings?|반지|손가락\s*링|finger\s*ring|피어싱|piercings?)/i;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const image = parseDataUrl(body.imageBase64, 1_500_000);
    const recommendation = cleanText(body.recommendation, 100);
    const feedback = cleanText(body.feedback, MAX_TEXT_LENGTH);
    const itemType = cleanText(body.itemType, 30);
    const editRegion = readEditRegion(body.editRegion, itemType);

    if (!image || !recommendation) {
      return json({ error: '사진과 추천 아이템이 필요합니다.' }, 400);
    }
    if (BLOCKED_ACCESSORY_PATTERN.test(recommendation)) {
      return json({ error: '귀걸이, 반지, 피어싱은 이미지 적용을 지원하지 않습니다.' }, 400);
    }
    if (!EDITABLE_ITEM_TYPES.has(itemType) || !editRegion) {
      return json({ error: '올바른 추천 아이템 유형과 편집 영역이 필요합니다.' }, 400);
    }

    const model = resolveAiModel(AI_FEATURES.STYLE_EDIT, env);
    const dimensions = outputDimensions(body.width, body.height);
    const result = await runAiModel(model, env, {
      image: base64ToBlob(image),
      prompt: buildEditPrompt(recommendation, feedback, itemType, editRegion),
      ...dimensions,
    });

    if (!result?.image || typeof result.image !== 'string') {
      return json({ error: '편집된 이미지가 생성되지 않았습니다.' }, 502);
    }

    return json({ image: `data:image/jpeg;base64,${result.image}` });
  } catch (error) {
    console.error('Style edit handler failed', error instanceof Error ? error.message : error);
    const publicError = toPublicAiError(error);
    return json({ error: publicError.message, code: publicError.code }, publicError.status);
  }
}

export function onRequestGet() {
  return json({ error: '허용되지 않은 요청 방식입니다.' }, 405);
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLength) : '';
}

function readEditRegion(value, itemType) {
  if (!value || typeof value !== 'object') return null;
  const region = Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Number(value[key])]));
  if (!Object.values(region).every(Number.isFinite)) return null;
  if (region.x < 0 || region.x > 100 || region.y < 0 || region.y > 100) return null;
  const limits = {
    clothing: [90, 95, 7200],
    bag: [60, 70, 3600],
    belt: [80, 35, 2200],
    shoes: [70, 45, 2600],
    watch: [35, 35, 1000],
    'fashion-accessory': [60, 60, 2600],
  }[itemType];
  if (!limits) return null;
  if (region.width < 1 || region.width > limits[0] || region.height < 1 || region.height > limits[1]) return null;
  if ((region.width * region.height) > limits[2]) return null;
  return region;
}

function buildEditPrompt(recommendation, feedback, itemType, editRegion) {
  const regionDescription = `Target region center is (${editRegion.x}%, ${editRegion.y}%) with size ${editRegion.width}% x ${editRegion.height}% of the full image.`;
  return [
    'NON-NEGOTIABLE EDIT BOUNDARY: modify only the explicitly requested garment or permitted fashion item. Identity, physical appearance, and anatomy preservation overrides every other instruction.',
    `Perform one strictly localized fashion edit on input image 0. Target category: ${itemType}.`,
    `Replace only the criticized target item with: ${recommendation}. Change pixels only inside the target item's existing physical area.`,
    regionDescription,
    'Do not edit any pixel outside that target region. If the target cannot be isolated safely, leave the image unchanged rather than expanding the edit.',
    'ALLOWED TARGETS are clothing, bags, belts, shoes, watches, and other non-invasive fashion items. Earrings, rings, and piercings are prohibited targets.',
    'ABSOLUTE NON-TARGET ITEM LOCK: every other garment, outer layer, inner layer, shoe, bag, belt, watch, accessory, and visible fabric not explicitly named as the target must remain identical to input image 0. Never restyle, recolor, resize, remove, add, open, close, or regenerate them.',
    feedback ? `Styling context: ${feedback}.` : '',
    'ABSOLUTE HUMAN LOCK: the person must remain exactly the same. Copy the original face, facial features, expression, identity, head, hair, makeup, skin, skin tone, neck, shoulders, arms, hands, fingers, legs, feet, body, silhouette, proportions, pose, and anatomy pixel-for-pixel. Never modify, regenerate, redraw, beautify, retouch, reinterpret, reshape, or relight any human feature.',
    'Preserve the exact original silhouette and physical boundaries of the person. The replacement garment must conform to the existing body and pose; the body must never conform to the new garment.',
    'Preserve camera angle, crop, perspective, lighting, shadows, background, surrounding objects, accessories, and every garment not explicitly requested.',
    'If the requested fashion item cannot be replaced without changing even one protected appearance or body detail, do not perform that conflicting change. Leave all protected pixels unchanged and make only the safest minimal target-item edit.',
    'Keep the result photorealistic. Do not add text, logos, borders, stickers, extra people, or accessories not requested.',
    'FINAL VALIDITY CHECK: any output with a changed face, appearance, identity, hair, body, skin, hands, pose, anatomy, background, or non-target fashion item is invalid. Restore every protected region and non-target item exactly from input image 0 before returning the result.',
  ].filter(Boolean).join(' ');
}

function outputDimensions(width, height) {
  const sourceWidth = Number(width);
  const sourceHeight = Number(height);
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 768, height: 1024 };
  }

  const scale = 1024 / Math.max(sourceWidth, sourceHeight);
  const normalized = (value) => Math.max(256, Math.min(1024, Math.round((value * scale) / 16) * 16));
  return { width: normalized(sourceWidth), height: normalized(sourceHeight) };
}

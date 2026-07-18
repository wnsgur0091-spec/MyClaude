import { AI_FEATURES, resolveAiModel } from '../_lib/ai/models.js';
import { runAiModel } from '../_lib/ai/run.js';
import { OUTFIT_RESULT_SCHEMA, parseOutfitResult } from '../_lib/ai/outfit-result.js';
import { toPublicAiError } from '../_lib/ai/errors.js';
import { json as jsonResponse, parseDataUrl } from '../_lib/http.js';

const ALLOWED_TPOS = new Set(['일상', '데이트', '출근', '운동', '하객']);

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { imageBase64, tpo } = body;
    const comparisonImage = body.comparisonImageBase64
      ? parseDataUrl(body.comparisonImageBase64)
      : null;
    const improvementItem = typeof body.improvementContext?.item === 'string'
      ? body.improvementContext.item.replace(/[\r\n]+/g, ' ').trim().slice(0, 100)
      : '';
    const previousScore = Number.isInteger(body.improvementContext?.previousScore)
      ? body.improvementContext.previousScore
      : null;
    const improvementItemType = typeof body.improvementContext?.itemType === 'string'
      ? body.improvementContext.itemType.replace(/[^a-z-]/g, '').slice(0, 30)
      : '';
    const improvementRegion = sanitizeEditRegion(body.improvementContext?.editRegion);

    const image = parseDataUrl(imageBase64);
    if (!image || (body.comparisonImageBase64 && !comparisonImage) || !ALLOWED_TPOS.has(tpo)) {
      return jsonResponse({ error: '사진과 올바른 TPO가 필요합니다.' }, 400);
    }

    const model = resolveAiModel(AI_FEATURES.OUTFIT_ANALYSIS, env);

    const base64Data = image.base64;
    const mimeType = image.mimeType;

    const prompt = `
당신은 트렌디하고 위트 있으며 뼈 때리는 패션 비평가인 'FitCheck 마스터'입니다.
사용자가 제출한 OOTD 사진과 상황(TPO)을 바탕으로 패션력을 평가하고 JSON 형식으로 응답해 주세요.
분석과 추천의 대상은 의상과 착용 가능한 패션 아이템입니다. 의상, 가방, 벨트, 신발, 시계와 그 밖의 패션 소품을 추천할 수 있습니다. 귀걸이·이어링, 반지, 피어싱은 상품 추천은 가능하지만 이미지 편집 대상에서는 반드시 제외됩니다. 얼굴, 머리, 피부, 신체, 체형, 신체 비율, 포즈 또는 정체성을 바꾸거나 보정하라고 절대 제안하지 마세요. 사람 자체는 평가·수정 대상이 아니며 이 규칙은 다른 모든 지침보다 우선합니다.

[TPO 상황]
${tpo}

${improvementItem ? `[개선본 재평가]
${comparisonImage ? '첫 번째 이미지는 원본이고 두 번째 이미지는 개선본입니다. 두 이미지를 직접 비교하세요.' : '이 사진은 개선본입니다.'}
기존 착장에서 ${improvementItem}(으)로 의상을 교체했습니다.
편집 대상 유형은 ${improvementItemType || '알 수 없음'}이며, 허용된 편집 영역은 ${improvementRegion ? `중심 (${improvementRegion.x}%, ${improvementRegion.y}%), 크기 ${improvementRegion.width}% x ${improvementRegion.height}%` : '제공되지 않음'}입니다.
기존 점수는 ${previousScore ?? '알 수 없음'}점입니다. 실제 사진에서 교체가 자연스럽고 TPO와 조화로워졌다면 score는 기존 점수보다 높게 평가하고, 좋아진 각 stats에도 실제 개선 폭을 반영하세요. 교체가 실패했거나 부자연스러울 때만 점수를 올리지 말고 보이지 않는 개선을 지어내지는 마세요.
스탯 중 "색상 불협화음", "과도한 격식도", "호감도 파괴력", "부장님 눈총 지수", "활동성 방해율", "퇴근 본능 자극도", "땀 배출 지연도", "신부 저격 민폐도"는 낮아질수록 개선입니다. 나머지 스탯은 높아질수록 개선입니다. 부정형 스탯을 개선했다는 이유로 수치를 올리지 마세요.
${comparisonImage ? `editAccepted는 추천 대상 아이템만 허용된 편집 영역 안에서 자연스럽게 바뀌고 얼굴·외모·머리·피부·신체·포즈·배경·카메라 구도·추천 대상이 아닌 다른 패션 아이템이 원본과 실질적으로 동일할 때만 true로 설정하세요. 허용 영역 밖이 달라졌거나 사람의 외모 또는 신체가 조금이라도 바뀌었거나 전체 인물을 다시 그렸다면 반드시 false여야 합니다.
comparisonSummary에는 두 이미지의 의상 변화만 내부 검토용으로 간결하게 설명하세요. 얼굴이나 신체 변화에 대한 상세 표현은 사용자용 improvementSummary에 절대 포함하지 마세요.` : ''}
improvementSummary에는 해당 아이템이 이전 문제를 어떻게 해결했는지 위트 있고 긍정적인 한 문장으로 설명하세요.` : ''}

[분석 및 응답 기준]
1. 패션력 점수(score): 0 ~ 10,000점 범위로 정수로만 평가해 주세요.
2. 티어(tier): 점수에 따라 다음 5개 중 정확히 매칭되는 티어 텍스트를 할당해 주세요.
   - 9000점 이상: "패션 챌린저"
   - 7500점 이상 9000점 미만: "다이아몬드"
   - 6000점 이상 7500점 미만: "골드"
   - 4000점 이상 6000점 미만: "실버"
   - 4000점 미만: "아이언"
3. 한줄평(roast): 점수와 상황(TPO)에 어울리는 위트 있고 직설적인 한줄평 (100~150자 내외). 점수가 낮을수록 뼈 때리는 매운맛(savage roast)이어야 하고, 높을수록 힙하고 시크한 칭찬이어야 합니다. 반드시 150자를 넘지 않도록 간결하게 끝내주세요.
4. 베스트 매치(bestMatches): 가장 뛰어난 아이템/부위 딱 1개만 배열에 담으세요. 반드시 1개여야 합니다.
   - name: 착장에서 가장 조화롭고 잘 어울리는 특정 아이템/부위에 대한 설명 (예: "와이드 카키 데님 팬츠: 루즈한 상의 핏과 완벽한 톤온톤 매치")
   - keyword: 해당 장점 아이템을 나타내는 짧은 한국어 태그 (예: "카고팬츠", "데님셔츠", "스니커즈")
   - x: 해당 아이템의 기하학적 중앙이 아니라, 소재·패턴·핏 등 장점이 가장 명확히 드러나는 의미 있는 지점의 가로 위치 백분율
   - y: 해당 아이템의 기하학적 중앙이 아니라, 소재·패턴·핏 등 장점이 가장 명확히 드러나는 의미 있는 지점의 세로 위치 백분율
5. 워스트 매치(worstMatches): 개선 포인트 제공은 이 서비스의 핵심이므로 어떤 코디라도 반드시 최소 1개, 최대 3개를 반환하세요. 완성도가 매우 높은 코디라도 배열을 비워서는 안 되며, 의상·가방·벨트·신발·시계·패션 소품·소재·색상 중 가장 효과적인 "한 끗 업그레이드"를 최소 1개 제안하세요. 사진 전체를 검토하고 실제로 개선 가치가 있는 서로 다른 지점을 중요한 순서대로 배열에 담으세요. 서로 다른 개선 지점이 2개 이상 보이면 절대로 1개에서 멈추지 말고 반드시 2~3개를 반환하세요. 같은 아이템을 표현만 바꿔 중복하지 마세요.
   - name: 현재 착장에서 해당 아이템이 왜 어색한지에 대한 구체적이고 위트 있는 진단. 추천 아이템 설명은 recommendReason에 따로 작성하고 여기서는 반복하지 마세요. (예: "투박한 회색 운동화가 미니멀 코디에 혼자 등산 동호회 출석을 완료했습니다.")
   - keyword: 해당 교체 대상 아이템을 나타내는 짧은 한국어 태그 (예: "회색운동화", "오버핏셔츠", "가죽벨트")
   - recommendItem: 대체 추천하는 단품 패션 아이템 이름 (예: "독일군 스니커즈"). 이 추천 명칭은 무신사 쇼핑몰에서 상품 검색이 바로 가능한 직관적인 한글 명사여야 합니다.
   - itemType: 추천 아이템의 유형. 의상은 "clothing", 가방은 "bag", 벨트는 "belt", 신발은 "shoes", 시계는 "watch", 그 밖의 이미지 적용 가능한 패션 소품은 "fashion-accessory"를 사용하세요. 귀걸이·이어링, 반지, 피어싱은 반드시 "unsupported-accessory"로 분류하세요.
   - editRegion: 원본에서 교체 대상 아이템 전체를 빠짐없이 감싸는 최소 사각형입니다. x, y는 사각형 중심의 백분율, width, height는 사진 전체 대비 사각형 크기의 백분율 정수입니다. 얼굴·머리카락·맨살·신체와 다른 아이템을 가능한 한 포함하지 마세요. 사진 전체처럼 과도하게 큰 영역을 지정하지 말고 실제 아이템 경계에 최대한 가깝게 잡으세요.
   - reasonTags: 추천 이유를 나타내는 짧은 한글 태그 2~3개 (예: ["트렌디", "가성비"]).
   - recommendReason: recommendItem이 현재 코디와 선택한 TPO를 어떻게 살려주는지 1~2문장으로 설명하세요. 사용자가 바로 이해할 수 있게 구체적으로 쓰되, FitCheck 특유의 위트 있는 패션 처방전 말투를 사용하세요. 현재 아이템을 비난하는 설명을 반복하지 말고 추천 아이템의 장점과 기대되는 변화를 설명하세요.
   - x: 아이템 중앙이 아니라 문제점이나 교체 필요성이 가장 잘 드러나는 의미 있는 부분의 가로 위치 백분율
   - y: 아이템 중앙이 아니라 문제점이나 교체 필요성이 가장 잘 드러나는 의미 있는 부분의 세로 위치 백분율
6. 무신사 검색어(musinsaQuery): worstMatches[0].recommendItem과 매치되는 검색용 핵심 단어
7. 상세 스탯(stats): 선택된 TPO 상황에 맞춰 지정된 5개 스탯 항목들의 개별 점수(0~100 사이 정수)를 매겨 주세요. 스탯 항목 이름(Key)은 반드시 오타 없이 아래에 정의된 5개 이름 그대로 사용해야 합니다.

[상황별 스탯 정의 (반드시 해당하는 TPO의 Key 이름을 매핑해 주세요)]
- 일상: {"색상 불협화음 🎨": 점수, "안구 보호도 👁️": 점수, "근자감 농도 ⚡": 점수, "지갑 방어력 💸": 점수, "마실 적합도 ☕": 점수}
- 데이트: {"설렘 유발 지수 💘": 점수, "과도한 격식도 🕴️": 점수, "센스 스포일러 🕶️": 점수, "호감도 파괴력 💔": 점수, "데이트 생존율 🧬": 점수}
- 출근: {"부장님 눈총 지수 😒": 점수, "프로페셔널 지수 💼": 점수, "활동성 방해율 🏃": 점수, "퇴근 본능 자극도 ⏰": 점수, "평판 수호 지수 🛡️": 점수}
- 운동: {"헬창 아우라 지수 🏋️": 점수, "거울 셀카 득표율 📸": 점수, "땀 배출 지연도 💦": 점수, "신체 보정 치트 📐": 점수, "근손실 위장도 🧬": 점수}
- 하객: {"신부 저격 민폐도 🏹": 점수, "하객 격식 비율 🤝": 점수, "사진 생존율 📸": 점수, "피로연 프리패스 🍽️": 점수, "친척 잔소리 실드 🛡️": 점수}

반드시 백틱(\`\`\`)이나 마크다운 마크업 없는 순수한 JSON 객체 형식으로만 응답해야 하며, 다음 JSON 스키마를 완벽히 준수해야 합니다:
{
  "score": number,
  "tier": string,
  "roast": string,
  "bestMatches": [{
    "name": string,
    "keyword": string,
    "x": number,
    "y": number
  }],
  "worstMatches": [{
    "name": string,
    "keyword": string,
    "recommendItem": string,
    "itemType": "clothing" | "bag" | "belt" | "shoes" | "watch" | "fashion-accessory" | "unsupported-accessory",
    "editRegion": { "x": number, "y": number, "width": number, "height": number },
    "reasonTags": [string, string],
    "recommendReason": string,
    "x": number,
    "y": number
  }],
  "musinsaQuery": string,
  "stats": {
    "키이름1": number,
    "키이름2": number,
    "키이름3": number,
    "키이름4": number,
    "키이름5": number
  }${comparisonImage ? `,
  "editAccepted": boolean,
  "comparisonSummary": string` : ''}
}
`;

    const imageParts = comparisonImage
      ? [
          { text: '[원본 이미지]' },
          { inlineData: { mimeType: comparisonImage.mimeType, data: comparisonImage.base64 } },
          { text: '[개선 이미지]' },
          { inlineData: { mimeType, data: base64Data } },
        ]
      : [{ inlineData: { mimeType, data: base64Data } }];

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...imageParts,
          ]
        }
      ],
      generationConfig: {
        responseFormat: {
          text: {
            mimeType: 'application/json',
            schema: comparisonImage
              ? {
                  ...OUTFIT_RESULT_SCHEMA,
                  required: [...OUTFIT_RESULT_SCHEMA.required, 'editAccepted'],
                }
              : OUTFIT_RESULT_SCHEMA,
          },
        },
      }
    };

    const response = await runAiModel(model, env, requestBody);
    return jsonResponse(parseOutfitResult(response, tpo, {
      requireEditDecision: Boolean(comparisonImage),
    }));
  } catch (error) {
    console.error('Analyze handler failed', error instanceof Error ? error.message : error);
    const publicError = toPublicAiError(error);
    return jsonResponse({ error: publicError.message, code: publicError.code }, publicError.status);
  }
}

function sanitizeEditRegion(value) {
  if (!value || typeof value !== 'object') return null;
  const region = Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Number(value[key])]));
  if (!Object.values(region).every(Number.isFinite)) return null;
  if (region.x < 0 || region.x > 100 || region.y < 0 || region.y > 100) return null;
  if (region.width < 1 || region.width > 100 || region.height < 1 || region.height > 100) return null;
  return region;
}

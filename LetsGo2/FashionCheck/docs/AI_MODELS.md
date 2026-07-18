# AI 모델 구성

## 현재 기능별 기본 모델

| 기능 | 공급자 | 기본 모델 | 교체 환경 변수 |
| --- | --- | --- | --- |
| OOTD 분석 | Google Gemini | `gemini-3.1-flash-lite` | `AI_OUTFIT_ANALYSIS_MODEL` |
| 개선점 이미지 적용 | Cloudflare Workers AI | `@cf/black-forest-labs/flux-2-klein-4b` | `AI_STYLE_EDIT_MODEL` |

환경 변수는 선택 사항입니다. 설정하지 않으면 레지스트리의 기본 모델을 사용합니다. 모델 ID를 바꾸기 전에 `functions/_lib/ai/models.js`에 모델과 capability를 등록해야 합니다.

## Cloudflare Pages 설정

1. Workers & Pages에서 `fitcheck-efx` Pages 프로젝트를 선택합니다.
2. Settings에서 Production 환경의 Bindings를 엽니다.
3. Add binding → Workers AI를 선택합니다.
4. Variable name을 정확히 `AI`로 입력하고 저장합니다.
5. Variables and Secrets에서 `GEMINI_API_KEY`가 Secret으로 등록됐는지 확인합니다.
6. 모델을 바꿀 때만 일반 환경 변수 `AI_OUTFIT_ANALYSIS_MODEL` 또는 `AI_STYLE_EDIT_MODEL`을 추가합니다.
7. 설정 변경 후 Production을 다시 배포합니다.

Preview 배포에서도 기능을 시험하려면 Preview 환경에 Secret과 AI binding을 각각 추가해야 합니다.

## 로컬 Pages Function 실행

`.dev.vars`:

```dotenv
GEMINI_API_KEY=your-key
AI_OUTFIT_ANALYSIS_MODEL=gemini-3.1-flash-lite
AI_STYLE_EDIT_MODEL=@cf/black-forest-labs/flux-2-klein-4b
```

```bash
npm run build
npx wrangler pages dev dist --ai AI
```

Workers AI binding을 이용한 로컬 호출도 Cloudflare 계정 사용량에 포함됩니다.

## 모델 추가 절차

1. `models.js` 레지스트리에 모델 ID, provider, capability를 등록합니다.
2. 기존 공급자라면 환경 변수만 변경합니다.
3. 새로운 공급자라면 `providers/`에 adapter를 추가하고 `run.js`에 provider를 등록합니다.
4. API route는 기능 키만 사용하며 모델 ID를 직접 다루지 않습니다.

서버는 클라이언트에서 전달된 모델 ID를 사용하지 않습니다. 이는 고비용 모델 임의 호출과 지원하지 않는 모델 선택을 방지합니다.

## 무료 이미지 편집 후보

### 1. FLUX.2 klein 4B — 기본 추천

- Workers AI의 이미지 생성·편집 및 최대 4개 참조 이미지 지원
- 빠른 고정 4-step 모델
- Pages의 `AI` binding으로 별도 공급자 API 키 없이 호출
- 현재 프로젝트처럼 단일 사진의 특정 의상을 바꾸는 빠른 미리보기에 가장 적합
- 입력 참조 이미지는 512×512 미만이어야 하므로 클라이언트에서 최대 496px로 축소

### 2. FLUX.2 klein 9B — 품질 비교 후보

- 동일한 Workers AI binding과 multipart 인터페이스를 사용해 교체가 쉬움
- 4B보다 품질을 우선한 A/B 테스트 후보
- 무료 전용 모델은 아니며 동일한 일일 Workers AI 무료 할당량을 소비하므로 호출 가능 횟수는 더 적을 수 있음

### 3. FLUX.2 dev — 개발·품질 검증 후보

- 다중 참조와 사실적인 결과가 중요한 실험에 적합
- klein 4B보다 단가가 높아 무료 할당량 내 운영용 기본값으로는 비추천

`FLUX.1 schnell`은 저렴한 텍스트→이미지 생성에는 유용하지만 참조 사진을 보존하는 의상 편집 용도에는 적합하지 않습니다.

## 품질상 주의점

생성형 편집 모델은 얼굴, 손, 체형, 배경을 완벽히 고정한다고 보장하지 않습니다. 현재 프롬프트는 추천 의상 외 요소를 유지하도록 지시하지만, 실제 운영 전 다양한 전신 사진으로 다음 항목을 확인해야 합니다.

- 얼굴과 신원 보존
- 체형과 포즈 보존
- 추천 부위 외 의상 변경 여부
- 손·신발 경계 왜곡
- 인물 사진 처리에 대한 사용자 고지 및 동의

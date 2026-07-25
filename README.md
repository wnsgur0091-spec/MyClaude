# FitCheck

사진과 상황(TPO)을 바탕으로 Gemini가 OOTD 피드백을 제공하는 Cloudflare Pages 앱입니다.

기존 FitCheck UI와 사용자 흐름은 `fitcheck/`에 유지하고, 저장소 루트의 Vite 설정에서 Cloudflare Pages용 `dist/` 산출물을 생성합니다.

## 로컬 실행

```bash
npm ci
npm run dev
```

Pages Function까지 로컬에서 확인하려면 `.dev.vars`에 `GEMINI_API_KEY`를 설정한 후 다음 명령을 사용합니다. Workers AI는 실제 Cloudflare 계정의 무료 할당량을 사용합니다.

```bash
npm run build
npx wrangler pages dev dist --ai AI
```

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 저장소 루트
- Secret: `GEMINI_API_KEY`
- Workers AI binding: `AI`
- Optional variable: `AI_OUTFIT_ANALYSIS_MODEL=gemini-3.1-flash-lite`
- Optional variable: `AI_STYLE_EDIT_MODEL=@cf/black-forest-labs/flux-2-klein-4b`
- Pages Functions: 저장소 루트의 `functions/`

API 키를 코드 또는 `VITE_` 환경 변수에 넣지 마세요. 배포 환경에서는 암호화된 `GEMINI_API_KEY` Secret만 사용합니다.

## AI 모델 확장

모델은 [functions/_lib/ai/models.js](functions/_lib/ai/models.js)의 레지스트리에서 기능별 capability와 공급자를 선언합니다. 새 모델을 추가할 때는 레지스트리에 등록하고 해당 provider adapter만 추가하면 UI나 API route를 수정할 필요가 없습니다.

- `outfitAnalysis`: OOTD 평가 및 JSON 결과 생성
- `styleEdit`: 추천 아이템을 사진에 적용

클라이언트 요청의 모델 ID는 신뢰하지 않습니다. 모델 교체는 Cloudflare 환경 변수로만 허용되며, 등록된 capability와 일치하지 않는 모델은 실행되지 않습니다.

자세한 설정과 모델 비교는 [docs/AI_MODELS.md](docs/AI_MODELS.md)를 참고하세요.

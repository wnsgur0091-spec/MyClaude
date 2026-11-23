# Brickrise 웹 (Next.js)

브릭라이즈 고객 화면, 관리자 화면, 서버 API를 담은 Next.js(App Router, TypeScript) 프로젝트입니다.
결정 사항과 규칙은 상위 폴더의 [`CLAUDE.md`](../CLAUDE.md)를 따릅니다.

## 폴더 구조

```
web/src/
├─ app/
│  ├─ (customer)/          고객 화면  ·  /  (첫 화면), /make (형태·크기 → 동의 → 사진 → 검사·생성 → 시안 → 주문 코드)
│  ├─ admin/               관리자 화면 · /admin/login, /admin (주문 검증·목록), /admin/orders/[code] (작업지시서)
│  └─ api/                 서버 API
│     ├─ session/          GET  기기 쿠키 발급, 동의 여부, 오늘 남은 무료 횟수
│     ├─ consents/         POST 사진 받기 전 동의 기록
│     ├─ drafts/           POST 사진 업로드 → 품질 검사 → 무료 횟수 → 시안 생성
│     ├─ order-codes/      POST 주문 코드 발급
│     └─ admin/            POST login · DELETE login(로그아웃) · POST verify(결제 후 검증)
├─ components/
│  ├─ customer/            고객 화면 컴포넌트 (MakeWizard 등)
│  ├─ admin/               관리자 화면 컴포넌트
│  └─ BrickCanvas.tsx      브릭 모델 미리보기 (공용)
├─ server/                 서버 전용 로직 (API·관리자 화면에서만 import)
│  ├─ db/                  저장소: Postgres / 메모리(개발용), 스키마
│  ├─ generation/          시안 생성: 평면 배색·품질 검사, 입체 생성기 인터페이스(임시 구현)
│  ├─ storage/             사진 원본 저장 (Vercel Blob 비공개 / 로컬)
│  ├─ drafts.ts            시안 만들기 흐름
│  ├─ orderCodes.ts        주문 코드 발급·검증 4단계
│  ├─ quota.ts             무료 횟수 (기기 하루 3회 + IP 하루 15회)
│  └─ auth.ts              관리자 세션
├─ shared/                 화면·서버 공용: 39색 팔레트, 가격, 옵션, 주문 코드 형식, 동의 항목
└─ middleware.ts           /admin, /api/admin 로그인 확인
```

## 로컬 실행

```bash
cd LetsGo2/Brickrise/web
npm install
cp .env.example .env.local   # 필요한 값만 채우기 (비워 둬도 개발 서버는 동작)
npm run dev                  # http://localhost:3000
```

- `DATABASE_URL`이 없으면 메모리 저장소를 써서 개발 서버를 재시작하면 데이터가 사라집니다.
- 개발 환경의 관리자 비밀번호 기본값은 `admin`입니다 (운영 환경에는 기본값 없음).

검사 명령:

```bash
npm test          # 단위 테스트 (vitest)
npm run lint      # 타입 검사
npm run build     # 운영 빌드
```

## Vercel 배포

이 저장소에는 이미 FashionCheck용 Vercel 프로젝트가 연결되어 있으므로, Brickrise는 **새 Vercel 프로젝트**로 따로 만듭니다.

1. Vercel 대시보드 → Add New → Project → `wnsgur0091-spec/MyClaude` 저장소 선택
2. **Root Directory**를 `LetsGo2/Brickrise/web`으로 지정 (Framework: Next.js 자동 인식)
3. Storage 탭에서 연결
   - **Neon (Postgres)**: Marketplace에서 추가하면 `DATABASE_URL`이 자동으로 들어옵니다. 테이블은 첫 요청 때 자동 생성됩니다.
   - **Blob**: 연결하면 `BLOB_STORE_ID`가 들어오고, 인증은 Vercel이 자동으로 처리합니다(OIDC, 토큰 변수 없음). 고객 사진이 비공개로 저장됩니다.
4. Settings → Environment Variables에서 직접 추가 (Key·Value 입력, Production·Preview 체크 → Save)
   - `ADMIN_PASSWORD`: 관리자 로그인 비밀번호
   - `SESSION_SECRET`: 길고 무작위인 문자열 (예: `openssl rand -hex 32` 결과)
   - `NEXT_PUBLIC_NAVER_STORE_URL`: 네이버 스마트스토어 상품 페이지 주소 (선택)
   - `BLOCK_WEIGHT_G`: 블럭 1개 무게 g (선택, 작업지시서 무게 환산)
5. 환경변수를 추가·변경한 뒤에는 Deployments → 최신 배포의 ⋯ → Redeploy (환경변수는 새 배포부터 적용). 이후 `main`에 머지되면 자동으로 운영 배포되고, PR마다 미리보기 배포가 만들어집니다.

`web/vercel.json`에 다음 설정이 들어 있어 대시보드에서 따로 할 필요가 없습니다.
- `regions: ["icn1"]`: 서버 함수를 서울 리전에서 실행
- `ignoreCommand`: `web/` 폴더가 바뀌지 않은 커밋(예: FashionCheck 수정)은 빌드를 건너뜀

## 아직 임시이거나 미정인 것

- **입체 생성**: 사용할 생성형 AI와 API 규격이 미정이라 실루엣을 부풀린 임시 생성기를 씁니다. 고객 화면에 "시연용 간이 입체" 안내가 뜹니다. 교체 방법은 [`../docs/ai-pipeline-interface.md`](../docs/ai-pipeline-interface.md).
- **가격**: 시연 페이지와 같은 임시 값 (`src/shared/pricing.ts`).
- **동의 문구**: 변호사 자문 전 초안 (`src/shared/consent.ts`, 문구가 바뀌면 `TERMS_VERSION`을 올릴 것).
- **사진 보관 기간 후 자동 삭제**: 보관 기간이 정해지면 추가.
- **설명서 PDF·QR 안내지**: 다음 단계.

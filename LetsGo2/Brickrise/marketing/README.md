# 브릭라이즈 스마트스토어 홍보물

| 파일 | 내용 |
|---|---|
| `smartstore-copy.md` | 상품명, 검색 태그, 옵션·추가상품·주문 코드 입력 설정, 상세페이지 순서, 공지사항, FAQ |
| `output/00_thumbnail_1000x1000.png` | 대표 이미지 (1000×1000) |
| `output/01~06_*_860.png` | 상세페이지 이미지 (가로 860px), 번호 순서대로 업로드 |
| `poster/poster.html` | 이미지 원본 (HTML). 문구·가격을 고치려면 이 파일을 수정 |
| `poster/render.js` | `poster.html` → PNG 렌더링, 사이트 주소로 QR 생성 |

빨간 점선 박스(`.tbd`)는 아직 확정되지 않은 값입니다. **확정 전에는 업로드하지 마세요.**

## 다시 렌더링하기

```bash
cd LetsGo2/Brickrise/marketing/poster
npm install --no-save playwright qrcode
npx playwright install chromium
node render.js https://최종-사이트-주소/make
```

결과는 `output/` 폴더에 덮어씁니다.

## 이미지에 쓴 시안

- 입체: 샘플 사진(`assets/sample_controller_photo.jpg`)을 TRELLIS.2로 만든 실제 브릭 모델 (`docs/demo.html`에서 추출, `poster/sample-data.js`)
- 평면: 같은 사진을 사이트와 같은 배색 로직으로 만든 결과
- 모든 시안 이미지에 "AI 생성 예시"를 표시

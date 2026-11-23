# 입체 생성 파이프라인 연결 지점

Image → 3D, 3D → Brick 생성형 AI 파이프라인은 타 팀원이 개발 중이고, 사용할 생성형 AI와 API 규격은 아직 정해지지 않았다.
웹은 아래 **내부 인터페이스** 하나로만 입체 생성을 호출하도록 만들어 두었다. 규격이 정해지면 이 인터페이스를 구현한 생성기만 추가하면 되고, 고객 화면·주문 코드·관리자 화면은 바꿀 필요가 없다.

## 인터페이스 (`web/src/server/generation/solid.ts`)

```ts
interface SolidGenerator {
  readonly name: string;    // 시안 기록에 남는 생성기 이름
  readonly isMock: boolean; // true면 고객 화면에 '시연용 간이 입체' 안내
  generate(input: SolidInput): Promise<BrickModel>;
}

type SolidInput = {
  photo: Buffer;     // 고객이 올린 사진 (브라우저에서 긴 변 1600px 이하로 줄인 JPG/PNG/WEBP)
  mimeType: string;
  size: 5 | 10 | 15; // cm (가로 기준)
  cols: number;      // 가로 칸 수: 5cm=6, 10cm=12, 15cm=18
  analysis: GridAnalysis; // 평면 배색 결과 (임시 생성기용, 실제 생성기는 무시해도 됨)
};
```

## 파이프라인이 돌려줘야 하는 결과: `BrickModel` (`web/src/shared/model.ts`)

```ts
type BrickModel = { X: number; Y: number; Z: number; cells: number[] };
```

- `X` 가로 칸, `Y` 높이(층, 아래가 0), `Z` 깊이 칸. 칸 하나 = 디폼블럭 하나 (8 × 8 × 7mm)
- `cells[(y * Z + z) * X + x]` = 39색 팔레트 인덱스(0~38, `web/src/shared/palette.ts` 순서 = `prototype/pal39.py` 순서), 빈칸은 `-1`
- 자동 배색은 36색만: 투명색·야광색·투명야광색(33·34·39번, 인덱스 32·33·38)은 쓰지 않는다
- 내부는 채우고, 떨어진 조각이 없어야 한다 (`prototype/cube.py`의 규칙)
- 가로(`X`)는 `cols`에 맞춘다

`prototype/cube.py`가 저장하는 `grid.npy`(`X × Y × Z`, 값 = 36색 이름 목록의 인덱스, 빈칸 -1)는 축 순서와 색 인덱스 기준이 다르므로, 연결할 때 위 형식으로 바꿔 주어야 한다.

## 교체 방법

1. `SolidGenerator`를 구현한 생성기 추가 (예: 외부 API 호출 → 결과를 `BrickModel`로 변환)
2. `getSolidGenerator()`가 새 생성기를 돌려주도록 수정
3. 생성에 오래 걸리면(수십 초 이상) 지금의 동기 방식(`POST /api/drafts`가 결과까지 기다림, 최대 60초) 대신 작업 ID를 받고 나중에 조회하는 방식으로 바꿔야 한다. API 규격이 정해지면 같이 결정할 것

## 정할 것 (타 팀원과 협의)

- 생성형 AI 업체 / 호출 방식 (동기 응답인지, 작업 ID + 조회·웹훅인지), 평균·최대 생성 시간
- 해외 업체라면 동의 화면의 "국외 이전" 항목에 이전 국가·업체·항목 기재
- 실패 시 처리: 무료 횟수 차감 여부 (현재는 생성 성공 후에만 차감)

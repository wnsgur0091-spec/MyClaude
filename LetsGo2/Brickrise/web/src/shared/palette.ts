/**
 * MYTOYS 디폼블럭 39색 팔레트 (확정된 구성품 기준, 변경 없음).
 * RGB는 판매 사진에서 측정한 값이며 prototype/pal39.py와 같다.
 * 배열 순서가 곧 모델 데이터에 저장되는 색상 인덱스이므로 순서를 바꾸지 말 것.
 */
export type PaletteColor = { no: string; name: string; rgb: readonly [number, number, number] };

export const PALETTE: readonly PaletteColor[] = [
  { no: "01", name: "연두색", rgb: [161, 236, 60] },
  { no: "02", name: "연녹색", rgb: [78, 244, 127] },
  { no: "03", name: "초록색", rgb: [17, 161, 91] },
  { no: "04", name: "카키색", rgb: [58, 79, 55] },
  { no: "05", name: "민트색", rgb: [99, 245, 209] },
  { no: "06", name: "하늘색", rgb: [134, 233, 249] },
  { no: "07", name: "연파랑색", rgb: [67, 202, 246] },
  { no: "08", name: "파랑색", rgb: [14, 102, 197] },
  { no: "09", name: "진파랑색", rgb: [25, 59, 165] },
  { no: "10", name: "남색", rgb: [22, 37, 71] },
  { no: "11", name: "베이지색", rgb: [251, 196, 110] },
  { no: "12", name: "레몬색", rgb: [241, 243, 55] },
  { no: "13", name: "노랑색", rgb: [252, 208, 40] },
  { no: "14", name: "귤색", rgb: [251, 149, 45] },
  { no: "15", name: "연보라색", rgb: [182, 155, 209] },
  { no: "16", name: "보라색", rgb: [112, 76, 187] },
  { no: "17", name: "진보라색", rgb: [61, 35, 124] },
  { no: "18", name: "자주색", rgb: [245, 75, 177] },
  { no: "19", name: "갈색", rgb: [130, 32, 17] },
  { no: "20", name: "진갈색", rgb: [100, 48, 40] },
  { no: "21", name: "살색", rgb: [251, 196, 174] },
  { no: "22", name: "주황색", rgb: [251, 112, 41] },
  { no: "23", name: "분홍색", rgb: [251, 162, 198] },
  { no: "24", name: "진분홍색", rgb: [249, 85, 111] },
  { no: "25", name: "빨강색", rgb: [232, 38, 43] },
  { no: "26", name: "핫핑크", rgb: [239, 61, 130] },
  { no: "27", name: "회색", rgb: [116, 116, 116] },
  { no: "28", name: "진회색", rgb: [67, 67, 67] },
  { no: "29", name: "검정색", rgb: [29, 29, 29] },
  { no: "30", name: "흰색", rgb: [234, 231, 225] },
  { no: "31", name: "연한살색", rgb: [249, 217, 188] },
  { no: "32", name: "황토색", rgb: [190, 97, 57] },
  { no: "33", name: "투명색", rgb: [213, 211, 217] },
  { no: "34", name: "야광색", rgb: [185, 192, 171] },
  { no: "35", name: "연노랑색", rgb: [227, 208, 102] },
  { no: "36", name: "개나리노랑", rgb: [247, 220, 79] },
  { no: "37", name: "진빨강색", rgb: [208, 31, 28] },
  { no: "38", name: "진초록색", rgb: [26, 107, 93] },
  { no: "39", name: "투명야광색", rgb: [209, 207, 213] },
];

/** 자동 배색에서 제외하는 색: 투명색·야광색·투명야광색 */
export const SPECIAL_NOS: ReadonlySet<string> = new Set(["33", "34", "39"]);

/** 자동 배색에 쓰는 36색의 PALETTE 인덱스 */
export const AUTO_INDICES: readonly number[] = PALETTE.map((c, i) => (SPECIAL_NOS.has(c.no) ? -1 : i)).filter((i) => i >= 0);

/** 무채색(흰·회·진회·검정): 회색조 픽셀은 이 색들 중에서만 고른다 */
export const NEUTRAL_INDICES: ReadonlySet<number> = new Set(
  PALETTE.map((c, i) => (["흰색", "회색", "진회색", "검정색"].includes(c.name) ? i : -1)).filter((i) => i >= 0),
);

export const rgbCss = (i: number, shade = 1) => {
  const [r, g, b] = PALETTE[i].rgb;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * shade)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};

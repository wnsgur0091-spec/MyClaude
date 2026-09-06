// 비정기 이벤트 풀 — 기획서에서 정리한 카테고리(연습/컨디션, 이미지/평판, 재무, 커리어, 성인전용)를 반영
// effects 타입: stat(스탯 등급 변동), fandom(팬덤 등급 변동, 데뷔 전엔 무시), asset(자산 등급/실수치 변동),
//               contractMonths(잔여계약기간 실수치 설정), debut(데뷔 처리), realestate(부동산 개수 증가)

const EVENT_POOL = [
  {
    id: "special_practice",
    category: "연습",
    badge: "비정기 이벤트",
    badgeTone: "amber",
    title: "심야 특별 연습 제안",
    desc: "소속사에서 데뷔조 평가를 앞두고 주말 심야 특별 연습을 제안했습니다. 실력 상승이 기대되지만 컨디션 소모가 큽니다.",
    condition: (s) => s.phase === "trainee",
    choices: [
      {
        label: "수락한다",
        tone: "accent",
        forecast: [
          { text: "가창력 ↑↑", tone: "up" },
          { text: "컨디션 ↓↓ 위험", tone: "warn" },
        ],
        effects: [
          { type: "stat", key: "가창력", tier: "M", dir: 1 },
          { type: "stat", key: "컨디션", tier: "L", dir: -1 },
        ],
      },
      {
        label: "거절한다",
        tone: "neutral",
        forecast: [{ text: "변동 없음", tone: "neutral" }],
        effects: [],
      },
    ],
  },
  {
    id: "injury",
    category: "연습",
    badge: "비정기 이벤트",
    badgeTone: "amber",
    title: "훈련 중 가벼운 부상",
    desc: "연습 중 발목을 살짝 삐끗했습니다. 무리해서 강행할지, 오늘은 쉬어갈지 선택하세요.",
    condition: () => true,
    choices: [
      {
        label: "강행한다",
        tone: "accent",
        forecast: [
          { text: "춤실력 ↑", tone: "up" },
          { text: "컨디션 ↓↓", tone: "warn" },
          { text: "20% 확률로 악화", tone: "warn" },
        ],
        resolve: (s) => {
          const worse = Math.random() < 0.2;
          const eff = [
            { type: "stat", key: "춤실력", tier: "S", dir: 1 },
            { type: "stat", key: "컨디션", tier: "L", dir: -1 },
          ];
          if (worse) eff.push({ type: "stat", key: "춤실력", tier: "M", dir: -1 });
          return eff;
        },
      },
      {
        label: "오늘은 쉰다",
        tone: "neutral",
        forecast: [{ text: "컨디션 ↑", tone: "up" }],
        effects: [{ type: "stat", key: "컨디션", tier: "M", dir: 1 }],
      },
    ],
  },
  {
    id: "donation",
    category: "이미지",
    badge: "비정기 이벤트",
    badgeTone: "amber",
    title: "재능기부 봉사활동 제안",
    desc: "무료 재능기부 봉사활동 요청이 들어왔습니다. 이미지 개선에 도움이 되지만 체력이 소모됩니다.",
    condition: () => true,
    choices: [
      {
        label: "참여한다",
        tone: "accent",
        forecast: [
          { text: "브랜드평판 ↑", tone: "up" },
          { text: "컨디션 ↓", tone: "warn" },
        ],
        effects: [
          { type: "stat", key: "브랜드평판", tier: "M", dir: 1 },
          { type: "stat", key: "컨디션", tier: "S", dir: -1 },
        ],
      },
      { label: "거절한다", tone: "neutral", forecast: [{ text: "변동 없음", tone: "neutral" }], effects: [] },
    ],
  },
  {
    id: "rumor",
    category: "이미지",
    badge: "이미지 이벤트",
    badgeTone: "pink",
    title: "악성 루머 확산",
    desc: "근거 없는 악성 루머가 SNS에 퍼지고 있습니다. YES/NO로는 표현이 어려운, 세 갈래 선택이 필요한 상황입니다.",
    condition: () => true,
    choices: [
      {
        label: "직접 해명한다",
        tone: "neutral",
        forecast: [
          { text: "브랜드평판 결과 불확실", tone: "warn" },
          { text: "컨디션 ↓", tone: "warn" },
        ],
        resolve: (s) => {
          const good = Math.random() < 0.5;
          return [
            { type: "stat", key: "브랜드평판", tier: good ? "S" : "M", dir: good ? 1 : -1 },
            { type: "stat", key: "컨디션", tier: "S", dir: -1 },
          ];
        },
      },
      {
        label: "침묵한다",
        tone: "neutral",
        forecast: [
          { text: "팬덤 ↓", tone: "down" },
          { text: "브랜드평판 변동 없음", tone: "neutral" },
        ],
        effects: [{ type: "fandom", tier: "S", dir: -1 }],
      },
      {
        label: "소속사에 위임한다",
        tone: "neutral",
        forecast: [
          { text: "자산 소폭 ↓ (홍보비)", tone: "neutral" },
          { text: "브랜드평판 소폭 ↓", tone: "down" },
        ],
        effects: [
          { type: "asset", tier: "S", dir: -1 },
          { type: "stat", key: "브랜드평판", tier: "S", dir: -1 },
        ],
      },
    ],
  },
  {
    id: "invest_tip",
    category: "재무",
    badge: "재무 이벤트",
    badgeTone: "blue",
    title: "지인의 투자 권유",
    desc: "지인이 코인/주식 투자를 권유합니다. 고위험 고수익입니다.",
    condition: () => true,
    choices: [
      {
        label: "투자한다",
        tone: "accent",
        forecast: [
          { text: "50% 확률 자산 ↑↑", tone: "up" },
          { text: "50% 확률 자산 ↓↓", tone: "warn" },
        ],
        resolve: (s) => [{ type: "asset", tier: "L", dir: Math.random() < 0.5 ? 1 : -1 }],
      },
      { label: "거절한다", tone: "neutral", forecast: [{ text: "변동 없음", tone: "neutral" }], effects: [] },
    ],
  },
  {
    id: "realestate",
    category: "재무",
    badge: "재무 이벤트",
    badgeTone: "blue",
    title: "꼬마빌딩 투자 제안",
    desc: "여유 자산으로 꼬마빌딩에 투자하지 않겠냐는 제안이 들어왔습니다. 목돈이 필요하지만 장기적으로 자산가치 상승이 기대됩니다.",
    condition: (s) => s.assets >= 50000000,
    choices: [
      {
        label: "투자한다",
        tone: "accent",
        forecast: [
          { text: "자산 ↓↓ (즉시 지출)", tone: "warn" },
          { text: "부동산 개수 +1", tone: "up" },
        ],
        effects: [
          { type: "asset", tier: "L", dir: -1 },
          { type: "realestate", add: 1 },
        ],
      },
      { label: "거절한다", tone: "neutral", forecast: [{ text: "변동 없음", tone: "neutral" }], effects: [] },
    ],
  },
  {
    id: "agency_scout",
    category: "커리어",
    badge: "커리어 이벤트",
    badgeTone: "indigo",
    title: "타 소속사 스카웃 제의",
    desc: "타 소속사에서 더 좋은 조건으로 이적을 제안합니다.",
    condition: () => true,
    choices: [
      {
        label: "이적한다",
        tone: "accent",
        forecast: [
          { text: "위약금 자산 ↓", tone: "warn" },
          { text: "계약기간 갱신", tone: "neutral" },
        ],
        effects: [
          { type: "asset", tier: "M", dir: -1 },
          { type: "contractMonths", exact: 36 },
        ],
      },
      {
        label: "거절한다",
        tone: "neutral",
        forecast: [{ text: "현 소속사 신뢰도 ↑", tone: "up" }],
        effects: [{ type: "stat", key: "브랜드평판", tier: "S", dir: 1 }],
      },
    ],
  },
  {
    id: "debut_offer",
    category: "커리어",
    badge: "커리어 이벤트",
    badgeTone: "indigo",
    title: "데뷔조 편성 제안",
    desc: "소속사로부터 데뷔조 편성 제안이 들어왔습니다. 지금까지의 노력이 결실을 맺을 시간입니다.",
    condition: (s) => s.phase === "trainee" && avgSkill(s) >= 50,
    weight: 2,
    choices: [
      {
        label: "수락한다",
        tone: "accent",
        forecast: [
          { text: "데뷔 확정", tone: "up" },
          { text: "데뷔 준비금 자산 ↓", tone: "warn" },
        ],
        effects: [
          { type: "asset", tier: "M", dir: -1 },
          { type: "debut" },
        ],
      },
      {
        label: "거절한다",
        tone: "neutral",
        forecast: [{ text: "다음 기회를 기다립니다", tone: "neutral" }],
        effects: [],
      },
    ],
  },
  {
    id: "dating_rumor",
    category: "성인",
    badge: "성인 이벤트",
    badgeTone: "pink",
    title: "회식 후 열애설",
    desc: "동료와의 늦은 회식 자리가 SNS에 포착되며 열애설이 돌고 있습니다.",
    condition: (s) => s.age >= 19,
    choices: [
      {
        label: "해명한다",
        tone: "neutral",
        forecast: [{ text: "결과 불확실", tone: "warn" }],
        resolve: () => [{ type: "stat", key: "브랜드평판", tier: "S", dir: Math.random() < 0.5 ? 1 : -1 }],
      },
      {
        label: "넘어간다",
        tone: "neutral",
        forecast: [{ text: "팬덤 ↓", tone: "down" }],
        effects: [{ type: "fandom", tier: "S", dir: -1 }],
      },
    ],
  },
  {
    id: "drunk_driving",
    category: "성인",
    badge: "성인 이벤트",
    badgeTone: "pink",
    title: "늦은 회식, 귀가는 어떻게?",
    desc: "늦은 회식 자리가 끝나고 귀가해야 합니다.",
    condition: (s) => s.age >= 19,
    choices: [
      {
        label: "직접 운전한다",
        tone: "accent",
        forecast: [{ text: "5% 확률로 사고 발생", tone: "warn" }],
        resolve: (s) => {
          if (Math.random() < 0.05) {
            return [
              { type: "stat", key: "브랜드평판", tier: "L", dir: -1 },
              { type: "asset", tier: "M", dir: -1 },
              { type: "stat", key: "컨디션", tier: "L", dir: -1 },
            ];
          }
          return [];
        },
      },
      {
        label: "대리를 부른다",
        tone: "neutral",
        forecast: [{ text: "자산 소폭 ↓ (비용)", tone: "neutral" }],
        effects: [{ type: "asset", tier: "S", dir: -1 }],
      },
    ],
  },
  {
    id: "plastic_surgery",
    category: "성인",
    badge: "성인 이벤트",
    badgeTone: "pink",
    title: "소속사의 성형 제안",
    desc: "소속사에서 이미지 메이킹을 위한 성형을 제안합니다.",
    condition: (s) => s.age >= 19,
    choices: [
      {
        label: "수락한다",
        tone: "accent",
        forecast: [
          { text: "외모력 ↑↑", tone: "up" },
          { text: "20% 확률 논란", tone: "warn" },
        ],
        resolve: () => {
          const eff = [{ type: "stat", key: "외모력", tier: "L", dir: 1 }];
          if (Math.random() < 0.2) eff.push({ type: "stat", key: "브랜드평판", tier: "S", dir: -1 });
          return eff;
        },
      },
      { label: "거절한다", tone: "neutral", forecast: [{ text: "변동 없음", tone: "neutral" }], effects: [] },
    ],
  },
  {
    id: "dating",
    category: "성인",
    badge: "성인 이벤트",
    badgeTone: "pink",
    title: "동료와의 연애 발전",
    desc: "최근 가까워진 동료와 연인으로 발전할 기회가 생겼습니다.",
    condition: (s) => s.age >= 19,
    choices: [
      {
        label: "받아들인다",
        tone: "accent",
        forecast: [{ text: "발각 시 열애설로 이어질 수 있음", tone: "warn" }],
        resolve: () => {
          if (Math.random() < 0.3) return [{ type: "stat", key: "브랜드평판", tier: "M", dir: -1 }];
          return [{ type: "stat", key: "컨디션", tier: "S", dir: 1 }];
        },
      },
      { label: "거절한다", tone: "neutral", forecast: [{ text: "변동 없음", tone: "neutral" }], effects: [] },
    ],
  },
];

function avgSkill(s) {
  return (s.stats.외모력 + s.stats.가창력 + s.stats.춤실력) / 3;
}

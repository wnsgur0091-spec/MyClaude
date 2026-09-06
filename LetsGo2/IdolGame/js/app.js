// 아이돌 키우기 — 플레이 가능한 데모 로직
"use strict";

const SAVE_KEY = "idolgame_state_v1";

const AGENCIES = ["스타라이트 엔터테인먼트", "문라이즈 뮤직", "블룸 엔터테인먼트", "오로라사운드", "넥스트비트 엔터"];
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

const STAT_TIER = { S: 2, M: 4, L: 8 };
const FANDOM_TIER_PCT = { S: 0.04, M: 0.12, L: 0.3 };
const ASSET_TIER = {
  trainee: { S: 2000000, M: 8000000, L: 30000000 },
  debut: { S: 3000000, M: 12000000, L: 40000000 },
  peak: { S: 8000000, M: 30000000, L: 100000000 },
};

const STAT_DESC = {
  외모력: "무대 비주얼 점수. 성형·스타일링 등 이벤트로 변동합니다.",
  가창력: "보컬 실력 점수. 연습과 특별 훈련으로 상승합니다.",
  춤실력: "퍼포먼스 실력 점수. 연습과 특별 훈련으로 상승합니다.",
  브랜드평판: "대중 이미지 점수. 기부 등 선행 시 상승, 열애설·사건사고 등 가십 발생 시 하락 (0~100)",
  팀워크: "그룹 활동에서의 협업 점수.",
  컨디션: "체력/컨디션 점수. 20 미만이면 위험 신호가 표시되고 병가(감기·몸살) 확률이 올라가며, 0이 되면 반드시 앓아눕습니다.",
};

const STAGE_LABEL = { trainee: "연습생", debut: "데뷔", peak: "전성기" };
const STAGE_COLOR = { trainee: "#5b6ee1", debut: "#7c5cf0", peak: "#b4223c" };

const EVAL_PASS_LINE = 40; // 이 평균 미만이면 하위권(경고 누적)
const EVAL_GOOD_LINE = 70; // 이 평균 이상이면 브랜드평판 상승

// 컨디션이 낮을수록 병가(감기·몸살) 확률이 올라가고, 0이면 100% 발생
function sicknessChance(cond) {
  if (cond <= 0) return 1;
  if (cond >= 20) return 0;
  return ((20 - cond) / 20) * 0.7;
}

let state = null;
let toastTimer = null;

// ---------- 유틸 ----------
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
function hasBatchim(word) {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return false;
  return (ch - 0xac00) % 28 !== 0;
}
function josa(word, withBatchim, withoutBatchim) { return word + (hasBatchim(word) ? withBatchim : withoutBatchim); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toDateObj(iso) { return new Date(iso + "T00:00:00"); }
function addDaysISO(iso, n) { const d = toDateObj(iso); d.setDate(d.getDate() + n); return toISO(d); }
function daysBetween(isoA, isoB) { return Math.round((toDateObj(isoB) - toDateObj(isoA)) / 86400000); }

// ---------- 저장/로드 ----------
function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearState() { localStorage.removeItem(SAVE_KEY); }

// ---------- 스테이지 ----------
function getDisplayStage(s) {
  if (s.phase === "trainee") return "trainee";
  return s.fandom >= 100000 ? "peak" : "debut";
}

// ---------- 효과 적용 ----------
function applyEffect(s, eff) {
  switch (eff.type) {
    case "stat":
      s.stats[eff.key] = clamp(s.stats[eff.key] + STAT_TIER[eff.tier] * eff.dir, 0, 100);
      break;
    case "statRaw":
      s.stats[eff.key] = clamp(s.stats[eff.key] + eff.amt, 0, 100);
      break;
    case "fandom": {
      if (s.phase === "trainee") break; // 데뷔 전에는 팬덤 미집계
      let amt = Math.round(s.fandom * FANDOM_TIER_PCT[eff.tier]);
      if (amt === 0) amt = 1;
      s.fandom = Math.max(0, s.fandom + amt * eff.dir);
      break;
    }
    case "asset": {
      const amt = "exact" in eff ? eff.exact : ASSET_TIER[getDisplayStage(s)][eff.tier] * eff.dir;
      s.assets += amt;
      break;
    }
    case "contractMonths":
      s.contractMonthsLeft = eff.exact;
      break;
    case "debut":
      s.phase = "debuted";
      s.debutDate = s.today;
      s.fandom = randInt(500, 1500);
      break;
    case "realestate":
      s.realEstateCount += eff.add;
      break;
  }
}
function applyEffects(s, list) { (list || []).forEach((e) => applyEffect(s, e)); }

// ---------- 이력(추세) ----------
function pushHistory(s) {
  s.history.push({ dayIndex: s.dayIndex, fandom: s.fandom, assets: s.assets });
  if (s.history.length > 90) s.history.shift();
}
function getTrend(s, field) {
  const target = s.dayIndex - 14;
  let best = s.history[0];
  for (const h of s.history) { if (h.dayIndex <= target) best = h; }
  return { delta: s[field] - best[field], days: s.dayIndex - best.dayIndex };
}

// ---------- 이벤트 선택 ----------
function pickEvent(s) {
  let pool = EVENT_POOL.filter((e) => e.condition(s));
  if (pool.length > 1) pool = pool.filter((e) => e.id !== s.lastEventId);
  if (pool.length === 0) return null;
  const weighted = [];
  pool.forEach((e) => { const w = e.weight || 1; for (let i = 0; i < w; i++) weighted.push(e); });
  return weighted[randInt(0, weighted.length - 1)];
}

// ---------- 게임오버 ----------
const ENDINGS = {
  bankrupt: { title: "파산으로 활동 종료", desc: "누적된 빚을 감당하지 못해 계약이 해지되었습니다." },
  retire: { title: "은퇴", desc: "오랜 활동을 뒤로하고 새로운 삶을 시작합니다. 수고하셨습니다!" },
  debut_fail_age: { title: "데뷔 실패", desc: "26세가 될 때까지 데뷔하지 못해 연습생 생활을 마감합니다." },
  debut_fail_release: { title: "연습생 방출", desc: "월말평가 하위권이 연속되어 소속사와의 계약이 종료되었습니다." },
};
function setGameOver(type) {
  state.gameOver = { type };
  saveState();
  renderGameOver();
}
function checkGameOver() {
  if (state.gameOver) return true;
  if (state.assets <= -1000000000) { setGameOver("bankrupt"); return true; }
  if (state.age >= 40) { setGameOver("retire"); return true; }
  if (state.phase === "trainee" && state.age >= 26) { setGameOver("debut_fail_age"); return true; }
  return false;
}

// ---------- 월말평가 ----------
function runMonthlyEvaluation() {
  const avg = avgSkill(state);
  let msg;
  if (avg >= EVAL_GOOD_LINE) {
    state.stats.브랜드평판 = clamp(state.stats.브랜드평판 + STAT_TIER.S, 0, 100);
    msg = "이번 달 평가 결과: 상위권! 브랜드평판이 소폭 상승했습니다.";
    state.lowEvalStreak = 0;
  } else if (avg >= EVAL_PASS_LINE) {
    msg = "이번 달 평가 결과: 무난합니다.";
    state.lowEvalStreak = 0;
  } else {
    state.lowEvalStreak = (state.lowEvalStreak || 0) + 1;
    msg = "이번 달 평가 결과: 하위권... 소속사로부터 경고를 받았습니다.";
  }
  showToast(msg);
  if (state.lowEvalStreak >= 2) { setGameOver("debut_fail_release"); return true; }
  return false;
}

// ---------- 하루 진행 ----------
function advanceDay() {
  if (state.gameOver) return;

  state.today = addDaysISO(state.today, 1);
  state.dayIndex += 1;
  if (state.phase === "trainee") state.assets -= randInt(20000, 60000);
  pushHistory(state);

  const d = toDateObj(state.today);
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === state.birthMonth && day === state.birthDay) state.age += 1;

  saveState();
  renderAll();
  if (checkGameOver()) return;

  if (day === 1) {
    if (state.phase === "trainee") {
      showToast(
        `이번 달 월말평가 기준 안내: 3대 스탯 평균 ${EVAL_PASS_LINE}점 이상이면 무난, ${EVAL_GOOD_LINE}점 이상이면 브랜드평판 상승. ${EVAL_PASS_LINE}점 미만이면 경고가 누적됩니다.`,
        4800
      );
    }
    state.contractMonthsLeft -= 1;
    if (state.contractMonthsLeft <= 0) { saveState(); openContractRenewal(); return; }
  }

  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (state.phase === "trainee" && day === lastDay) {
    const over = runMonthlyEvaluation();
    saveState();
    renderAll();
    if (over) return;
  }

  if (Math.random() < sicknessChance(state.stats.컨디션)) {
    saveState();
    openSicknessEvent();
    return;
  }

  if (state.dayIndex - state.lastEventDay >= 14) {
    const chance = Math.min(0.9, 0.5 + 0.05 * (state.dayIndex - state.lastEventDay - 14));
    if (Math.random() < chance) {
      const ev = pickEvent(state);
      if (ev) { state.lastEventDay = state.dayIndex; saveState(); openEventModal(ev); return; }
    }
  }

  openDailyActivityModal();
}

// ---------- 모달: 공용 렌더 ----------
const modalOverlayEl = () => document.getElementById("modal-overlay");
const modalCardEl = () => document.getElementById("modal-card");

function closeModal() {
  modalOverlayEl().hidden = true;
  modalCardEl().innerHTML = "";
}

function formatDateLabel(iso) {
  const d = toDateObj(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`;
}

const BADGE_CLASS = { amber: "badge-amber", pink: "badge-pink", blue: "badge-blue", indigo: "badge-indigo", red: "badge-red" };

function renderModal(spec, onResolve) {
  const usesExact = spec.choices.some((c) => c.exactLines);
  const forecastLabel = usesExact ? "예상 변동 (실수치 표기)" : "예상 변동 (정확한 수치 비공개)";

  const choicesHtml = spec.choices
    .map((c, i) => {
      const inner = c.exactLines
        ? `<div class="chip-row" style="flex-direction:column;align-items:flex-start;gap:4px;">
             ${c.exactLines.map((t) => `<div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700;color:${c.tone === "accent" ? "#2f8a5b" : "#8a8a86"};">${escapeHtml(t)}</div>`).join("")}
           </div>`
        : `<div class="chip-row">
             ${(c.forecast || []).map((f) => `<span class="fchip ${f.tone}">${escapeHtml(f.text)}</span>`).join("")}
           </div>`;
      return `<button type="button" class="choice-btn ${c.tone === "accent" ? "accent" : ""}" data-idx="${i}">
                <div class="choice-label">${escapeHtml(c.label)}</div>
                ${inner}
              </button>`;
    })
    .join("");

  modalCardEl().innerHTML = `
    <div class="modal-head">
      <div class="modal-date">${formatDateLabel(state.today)}</div>
      ${spec.badge ? `<span class="modal-badge ${BADGE_CLASS[spec.badgeTone] || "badge-indigo"}">${escapeHtml(spec.badge)}</span>` : ""}
    </div>
    <div class="modal-title">${escapeHtml(spec.title)}</div>
    ${spec.desc ? `<div class="modal-desc">${escapeHtml(spec.desc)}</div>` : ""}
    <div class="modal-forecast-label">${forecastLabel}</div>
    <div class="choice-list">${choicesHtml}</div>
  `;
  modalOverlayEl().hidden = false;

  modalCardEl().querySelectorAll(".choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      onResolve(spec.choices[idx]);
    });
  });
}

function openEventModal(ev) {
  renderModal(
    { title: ev.title, desc: ev.desc, badge: ev.badge, badgeTone: ev.badgeTone, choices: ev.choices },
    (choice) => {
      const effects = choice.resolve ? choice.resolve(state) : choice.effects || [];
      applyEffects(state, effects);
      state.eventLog.push({ date: state.today, title: ev.title });
      state.lastEventId = ev.id;
      closeModal();
      saveState();
      renderAll();
      checkGameOver();
    }
  );
}

function openContractRenewal() {
  const investAmt = ASSET_TIER[getDisplayStage(state)].L;
  const spec = {
    title: "재계약 제안",
    badge: "계약 이벤트",
    badgeTone: "blue",
    desc: `${josa(state.agency, "이", "가")} 3년간 ${fmt(investAmt)}원 투자를 조건으로 계약 연장을 제안했습니다.`,
    choices: [
      {
        label: "수락한다",
        tone: "accent",
        exactLines: [`자산 +${fmt(investAmt)}원 (즉시 지급)`, "잔여계약기간 36개월로 갱신"],
        effects: [{ type: "asset", exact: investAmt }, { type: "contractMonths", exact: 36 }],
      },
      {
        label: "거절한다",
        tone: "neutral",
        exactLines: ["위약금 소액 지불 후 계약 종료", "신규 소속사와 재계약 (36개월)"],
        effects: [{ type: "asset", tier: "S", dir: -1 }, { type: "contractMonths", exact: 36 }],
      },
    ],
  };
  renderModal(spec, (choice) => {
    applyEffects(state, choice.effects);
    closeModal();
    saveState();
    renderAll();
    checkGameOver();
  });
}

function openSicknessEvent() {
  const spec = {
    title: "감기 몸살로 앓아누움",
    badge: "건강 이벤트",
    badgeTone: "red",
    desc: "컨디션이 바닥나 몸살이 났습니다. 오늘은 아무것도 하지 못하고 하루 종일 앓아누웠습니다.",
    choices: [
      {
        label: "오늘은 푹 쉰다",
        tone: "neutral",
        exactLines: ["외모력·가창력·춤실력 각 -1 (훈련 공백)", "컨디션 +6 (강제 휴식)"],
        effects: [
          { type: "statRaw", key: "외모력", amt: -1 },
          { type: "statRaw", key: "가창력", amt: -1 },
          { type: "statRaw", key: "춤실력", amt: -1 },
          { type: "statRaw", key: "컨디션", amt: 6 },
        ],
      },
    ],
  };
  renderModal(spec, (choice) => {
    applyEffects(state, choice.effects);
    state.eventLog.push({ date: state.today, title: "감기 몸살" });
    closeModal();
    saveState();
    renderAll();
    checkGameOver();
  });
}

function openDailyActivityModal() {
  const skillChoice = (key) => ({
    label: `${key} 늘리기`,
    tone: "accent",
    exactLines: [`${key} +3`, "다른 두 스탯 각 -1", "컨디션 -6"],
    effects: [
      { type: "statRaw", key, amt: 3 },
      ...["외모력", "가창력", "춤실력"].filter((k) => k !== key).map((k) => ({ type: "statRaw", key: k, amt: -1 })),
      { type: "statRaw", key: "컨디션", amt: -6 },
    ],
  });
  const spec = {
    title: "오늘의 활동",
    badge: null,
    desc: "오늘은 특별한 일정이 없습니다. 무엇을 하시겠습니까?",
    choices: [
      skillChoice("외모력"),
      skillChoice("가창력"),
      skillChoice("춤실력"),
      {
        label: "오늘은 쉰다",
        tone: "neutral",
        exactLines: ["외모력·가창력·춤실력 각 -1", "컨디션 +10"],
        effects: [
          { type: "statRaw", key: "외모력", amt: -1 },
          { type: "statRaw", key: "가창력", amt: -1 },
          { type: "statRaw", key: "춤실력", amt: -1 },
          { type: "statRaw", key: "컨디션", amt: 10 },
        ],
      },
    ],
  };
  renderModal(spec, (choice) => {
    applyEffects(state, choice.effects);
    closeModal();
    saveState();
    renderAll();
    checkGameOver();
  });
}

// ---------- 토스트 ----------
function showToast(msg, ms) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms || 3200);
}

// ---------- 렌더링 ----------
function renderAll() {
  if (state.gameOver) { renderGameOver(); return; }
  renderPortrait();
  renderProfile();
  renderStats();
  renderScaleStats();
  renderCalendar();
}

function renderPortrait() {
  const stage = getDisplayStage(state);
  document.getElementById("portrait-img").innerHTML = CHARACTER_ILLUSTRATIONS[stage];
  const chip = document.getElementById("stage-chip");
  chip.textContent = STAGE_LABEL[stage];
  chip.style.background = STAGE_COLOR[stage];
  chip.style.color = "#fff";
}

function renderProfile() {
  const d = toDateObj(state.today);
  document.getElementById("today-label").textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 기준`;

  let debutValue;
  if (state.phase === "trainee") {
    const years = Math.max(1, Math.floor(daysBetween(state.createdISO, state.today) / 365) + 1);
    debutValue = `미정 (연습생 ${years}년차)`;
  } else {
    const dd = toDateObj(state.debutDate);
    const years = Math.max(1, Math.floor(daysBetween(state.debutDate, state.today) / 365) + 1);
    debutValue = `${dd.getFullYear()}.${String(dd.getMonth() + 1).padStart(2, "0")}.${String(dd.getDate()).padStart(2, "0")} (${years}년차)`;
  }

  const years = Math.floor(state.contractMonthsLeft / 12), months = state.contractMonthsLeft % 12;
  const contractStr = years > 0 ? `${years}년 ${months}개월` : `${months}개월`;

  const items = [
    ["성별", state.gender],
    ["나이", `${state.age}세`],
    ["생일", `${String(state.birthMonth).padStart(2, "0")}.${String(state.birthDay).padStart(2, "0")}`],
    ["이름", state.name],
    ["활동명", state.stageName],
    ["소속사", state.agency],
    ["잔여계약기간", contractStr],
    ["데뷔일시(+연차)", debutValue],
  ];
  document.getElementById("profile-grid").innerHTML = items
    .map(([k, v]) => `<div class="profile-item"><div class="k">${k}</div><div class="v">${escapeHtml(v)}</div></div>`)
    .join("");
}

function renderStats() {
  const rows = ["외모력", "가창력", "춤실력", "브랜드평판", "팀워크", "컨디션"];
  const html = rows
    .map((key) => {
      const val = Math.round(state.stats[key]);
      const isWarn = val < 20;
      return `
        <div class="stat-row">
          <div class="stat-label ${isWarn ? "warn" : ""}">
            ${key}
            <span class="info-ic">ⓘ</span>
            <div class="tooltip-bubble">${STAT_DESC[key]}</div>
          </div>
          <div class="stat-track"><div class="stat-fill ${isWarn ? "warn" : ""}" style="width:${val}%;"></div></div>
          <div class="stat-val" style="${isWarn ? "color:#c23b3b;" : ""}">${val}</div>
          <div class="stat-warn-tag">${isWarn ? "⚠ 주의" : ""}</div>
        </div>`;
    })
    .join("");
  document.getElementById("stat-bars").innerHTML = html;
}

function renderScaleStats() {
  let fandomHtml;
  if (state.phase === "trainee") {
    fandomHtml = `
      <div class="scale-item">
        <div class="k">팬덤</div>
        <div><span class="big muted-num">0</span><span class="unit">명</span></div>
        <div class="sub italic">데뷔 전에는 팬덤이 집계되지 않습니다</div>
      </div>`;
  } else {
    const t = getTrend(state, "fandom");
    const up = t.delta >= 0;
    fandomHtml = `
      <div class="scale-item">
        <div class="k">팬덤</div>
        <div><span class="big">${fmt(state.fandom)}</span><span class="unit">명</span></div>
        <div class="trend ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${up ? "+" : ""}${fmt(t.delta)}명 <span class="muted" style="font-weight:400;">· ${t.days >= 14 ? "최근 2주" : "게임 시작 이후"}</span></div>
      </div>`;
  }

  const at = getTrend(state, "assets");
  const aUp = at.delta >= 0;
  const assetSub =
    state.phase === "trainee"
      ? "연습생 기간 · 데뷔 후 상환 예정"
      : getDisplayStage(state) === "peak"
      ? "전성기 · 다각화된 수익원 (광고·부동산 등)"
      : "데뷔 후 수익으로 상환 진행 중";

  const assetsHtml = `
    <div class="scale-item">
      <div class="k">자산</div>
      <div><span class="big ${state.assets < 0 ? "negative" : ""}">${fmt(state.assets)}</span><span class="unit">원</span></div>
      <div class="trend ${aUp ? "up" : "down"}">${aUp ? "▲" : "▼"} ${aUp ? "+" : ""}${fmt(at.delta)}원 <span class="muted" style="font-weight:400;">· ${at.days >= 14 ? "최근 2주" : "게임 시작 이후"}</span></div>
      <div class="sub">${assetSub}${state.realEstateCount > 0 ? ` · 부동산 ${state.realEstateCount}개` : ""}</div>
    </div>`;

  document.getElementById("scale-stats").innerHTML = fandomHtml + assetsHtml;
}

function renderCalendar() {
  const d = toDateObj(state.today);
  const y = d.getFullYear(), m = d.getMonth() + 1;
  document.getElementById("calendar-title").textContent = `${y}년 ${m}월`;

  const isTrainee = state.phase === "trainee";
  document.getElementById("legend-eval").style.display = isTrainee ? "" : "none";

  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const lastDay = new Date(y, m, 0).getDate();

  const pastEventDates = new Set(state.eventLog.map((e) => e.date));

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) cells += `<div class="cal-cell blank"></div>`;
  for (let day = 1; day <= lastDay; day++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = day === d.getDate();
    const isEvalDay = isTrainee && day === lastDay;
    let cls = "cal-cell";
    if (isToday) cls += " today clickable";
    if (isEvalDay) cls += " eval-day";

    let inner = `${day}`;
    if (isToday) inner += `<span class="badge-today">오늘</span>`;
    else if (isEvalDay) inner += `<span class="badge-eval">⚑ 월말평가</span>`;
    else if (pastEventDates.has(iso)) inner += `<span class="badge-past"><span class="dot dot-gray"></span>발생함</span>`;

    cells += `<div class="${cls}" data-date="${iso}">${inner}</div>`;
  }

  document.getElementById("calendar-grid").innerHTML = `
    <div class="cal-head-cell sun">일</div><div class="cal-head-cell">월</div><div class="cal-head-cell">화</div>
    <div class="cal-head-cell">수</div><div class="cal-head-cell">목</div><div class="cal-head-cell">금</div>
    <div class="cal-head-cell sat">토</div>${cells}`;

  document.querySelectorAll(".cal-cell.clickable").forEach((el) => el.addEventListener("click", advanceDay));

  document.getElementById("contract-note").textContent = `다음 계약 갱신까지 ${state.contractMonthsLeft}개월`;
}

function renderGameOver() {
  const info = ENDINGS[state.gameOver.type];
  const stage = getDisplayStage(state);
  modalCardEl().innerHTML = `
    <div class="game-over-card">
      <div class="eyebrow" style="margin-bottom:6px;">GAME OVER</div>
      <h2>${info.title}</h2>
      <p class="modal-desc" style="text-align:center;">${info.desc}</p>
      <div class="game-over-stats">
        <div class="row2"><span>최종 나이</span><b>${state.age}세</b></div>
        <div class="row2"><span>최종 단계</span><b>${STAGE_LABEL[stage]}</b></div>
        <div class="row2"><span>최종 팬덤</span><b>${fmt(state.fandom)}명</b></div>
        <div class="row2"><span>최종 자산</span><b>${fmt(state.assets)}원</b></div>
        <div class="row2"><span>플레이 일수</span><b>${state.dayIndex}일</b></div>
      </div>
      <button id="btn-restart" class="btn-primary btn-large">새로 시작하기</button>
    </div>`;
  modalOverlayEl().hidden = false;
  document.getElementById("btn-restart").addEventListener("click", resetGame);
}

// ---------- 화면 전환 ----------
function showCreateScreen() {
  document.getElementById("screen-create").hidden = false;
  document.getElementById("screen-game").hidden = true;
}
function showGameScreen() {
  document.getElementById("screen-create").hidden = true;
  document.getElementById("screen-game").hidden = false;
}

function resetGame() {
  clearState();
  state = null;
  closeModal();
  showCreateScreen();
}

// ---------- 캐릭터 생성 ----------
function initGame({ gender, age, name, stageName }) {
  const todayISO = toISO(new Date());
  const birthMonth = randInt(1, 12);
  const birthDay = randInt(1, 28);
  const agency = AGENCIES[randInt(0, AGENCIES.length - 1)];

  state = {
    gender, age, name, stageName: stageName || name,
    birthMonth, birthDay,
    agency, contractMonthsLeft: 36,
    phase: "trainee", debutDate: null,
    stats: { 외모력: randInt(30, 55), 가창력: randInt(30, 55), 춤실력: randInt(30, 55), 브랜드평판: 40, 팀워크: 50, 컨디션: 80 },
    fandom: 0, assets: 0, realEstateCount: 0,
    history: [{ dayIndex: 0, fandom: 0, assets: 0 }],
    today: todayISO, dayIndex: 0, createdISO: todayISO,
    lastEventDay: 0, lastEventId: null,
    lowEvalStreak: 0, eventLog: [],
    gameOver: null,
  };
  saveState();
  showGameScreen();
  renderAll();
}

// ---------- 초기화 ----------
function wireCreateScreen() {
  const genderSeg = document.getElementById("gender-seg");
  let gender = "여";
  genderSeg.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      genderSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      gender = btn.dataset.value;
    });
  });

  document.getElementById("btn-start").addEventListener("click", () => {
    const age = clamp(Number(document.getElementById("input-age").value) || 15, 10, 15);
    const name = document.getElementById("input-name").value.trim() || "이름없음";
    const stageName = document.getElementById("input-stagename").value.trim();
    initGame({ gender, age, name, stageName });
  });
}

function wireGameScreen() {
  document.getElementById("btn-advance").addEventListener("click", advanceDay);
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (confirm("정말 새로 시작하시겠습니까? 진행 상황이 모두 초기화됩니다.")) resetGame();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireCreateScreen();
  wireGameScreen();

  const saved = loadState();
  if (saved) {
    state = saved;
    showGameScreen();
    if (state.gameOver) renderGameOver();
    else renderAll();
  } else {
    showCreateScreen();
  }
});

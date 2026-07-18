// ========================================================
// FITCHECK! CORE APP CONTROLLER
// ========================================================

// 1. 글로벌 상태 (State)
const state = {
  activeScreen: 'screen-upload',
  selectedTpo: '일상',          // 디폴트 상황: '일상'
  currentOotdImage: null,      // 사용자가 업로드한 OOTD 이미지 Base64 데이터
  originalOotdImage: null,
  improvedOotdImage: null,
  
  // 측정 결과 데이터
  score: 0,
  originalScore: 0,
  tier: '실버',
  isPatched: false,            // 추천 코디 가상 장착 여부
  
  // 5대 상세 스탯 데이터
  stats: [],

  // 배틀 모드 관련 상태값
  isBattleMode: false,
  opponentScore: 0,
  opponentTpo: '일상',

  // 무신사 연계 팝업용 임시 보관 상태
  targetMusinsaUrl: '',
  targetMusinsaItem: '독일군 스니커즈',

  // AI API 결과 임시 보관
  apiData: null,

  // 공유 기능용 임시 보관 데이터
  shareImageDataUrl: null,
  shareImageFile: null,

  // 최근 패션 체크 기록용 임시 ID (같은 세션 내 개선 적용 시 동일 기록을 갱신)
  currentRecordId: null,
};

const RECENT_CHECKS_DB_NAME = 'fitcheck-recent-checks';
const RECENT_CHECKS_STORE = 'checks';
const RECENT_CHECKS_LIMIT = 3;

// 2. DOM 요소 셀렉터
const dom = {
  appToast: document.getElementById('app-toast'),
  toastText: document.getElementById('toast-text'),
  appHeader: document.getElementById('app-header'),
  firstVisitGuide: document.getElementById('first-visit-guide'),
  btnCloseFirstVisitGuide: document.getElementById('btn-close-first-visit-guide'),
  tutorialSlides: document.getElementById('tutorial-slides'),
  tutorialDots: document.querySelectorAll('.tutorial-dot'),

  // 화면 세션들
  screenUpload: document.getElementById('screen-upload'),
  screenLoading: document.getElementById('screen-loading'),
  screenResult: document.getElementById('screen-result'),
  
  // 메인 업로드 화면
  uploadBoxTrigger: document.getElementById('upload-box-trigger'),
  uploadPlaceholder: document.getElementById('upload-placeholder'),
  uploadPreviewContainer: document.getElementById('upload-preview-container'),
  uploadPreviewImg: document.getElementById('upload-preview-img'),
  imageFileInput: document.getElementById('image-file-input'),
  tpoChips: document.querySelectorAll('.tpo-chip'),
  btnSubmitScan: document.getElementById('btn-submit-scan'),
  recentChecksCard: document.getElementById('recent-checks-card'),
  recentChecksList: document.getElementById('recent-checks-list'),

  // 로딩 화면
  loadingTitle: document.getElementById('loading-title'),
  loadingStatusText: document.getElementById('loading-status-text'),
  loadingProgressFill: document.getElementById('loading-progress-fill'),
  analysisErrorPanel: document.getElementById('analysis-error-panel'),
  analysisErrorMessage: document.getElementById('analysis-error-message'),
  btnAnalysisRetry: document.getElementById('btn-analysis-retry'),
  
  // 결과 화면
  resultOotdImg: document.getElementById('result-ootd-img'),
  resultTopOverlayTag: document.getElementById('result-top-overlay-tag'),
  tagContainer: document.getElementById('tag-container'),
  tagLinesSvg: document.getElementById('tag-lines-svg'),
  feedbackTooltip: document.getElementById('feedback-tooltip'),
  tooltipTitle: document.getElementById('tooltip-title'),
  tooltipContent: document.getElementById('tooltip-content'),
  btnCloseTooltip: document.getElementById('btn-close-tooltip'),
  linkShopping: document.getElementById('link-shopping'),
  btnApplyAdvice: document.getElementById('btn-apply-advice'),
  imageVersionToggle: document.getElementById('image-version-toggle'),
  btnShowBefore: document.getElementById('btn-show-before'),
  btnShowAfter: document.getElementById('btn-show-after'),
  styleEditOverlay: document.getElementById('style-edit-overlay'),
  styleEditStatus: document.getElementById('style-edit-status'),
  styleEditScorePanel: document.getElementById('style-edit-score-panel'),
  styleEditScore: document.getElementById('style-edit-score'),
  styleEditScoreDelta: document.getElementById('style-edit-score-delta'),
  improvedShoppingCard: document.getElementById('improved-shopping-card'),
  improvedShoppingItem: document.getElementById('improved-shopping-item'),
  improvedShoppingDescription: document.getElementById('improved-shopping-description'),
  improvedShoppingLink: document.getElementById('improved-shopping-link'),
  
  resultScoreNum: document.getElementById('result-score-num'),
  resultTierName: document.getElementById('result-tier-name'),
  resultRoastText: document.getElementById('result-roast-text'),
  vibeCheckTitle: document.getElementById('vibe-check-title'),
  statsContainer: document.getElementById('stats-container'),
  
  btnShareStory: document.getElementById('btn-share-story'),
  btnRetry: document.getElementById('btn-retry'),
  instagramExportCanvas: document.getElementById('instagram-export-canvas'),
  
  // 신규 배틀 및 인스타 연동 모달 관련
  btnCopyLink: document.getElementById('btn-copy-link'),
  instagramRedirectModal: document.getElementById('instagram-redirect-modal'),
  btnCloseRedirectModal: document.getElementById('btn-close-redirect-modal'),
  btnOpenInstagramApp: document.getElementById('btn-open-instagram-app'),
  btnShareSystem: document.getElementById('btn-share-system'),
  btnDownloadImage: document.getElementById('btn-download-image'),
  instagramPreviewImg: document.getElementById('instagram-preview-img'),

  // 배틀 모드 관련 추가 DOM
  battleChallengeCard: document.getElementById('battle-challenge-card'),
  battleTpoBadge: document.getElementById('battle-tpo-badge'),
  opponentScoreDisplay: document.getElementById('opponent-score-display'),
  battleVersusContainer: document.getElementById('battle-versus-container'),
  resultOotdImgChallenger: document.getElementById('result-ootd-img-challenger'),
  stampOpp: document.getElementById('stamp-opp'),
  stampChallenger: document.getElementById('stamp-challenger'),
  vsOppScore: document.getElementById('vs-opp-score'),
  vsOppTier: document.getElementById('vs-opp-tier'),
  resultHeaderBadge: document.getElementById('result-header-badge'),
  resultTopOverlayBadge: document.getElementById('result-top-overlay-badge'),
  
  // 무신사 연동 모달 관련 DOM
  musinsaRedirectModal: document.getElementById('musinsa-redirect-modal'),
  btnCloseMusinsaModal: document.getElementById('btn-close-musinsa-modal'),
  btnCloseMusinsaModalCancel: document.getElementById('btn-close-musinsa-modal-cancel'),
  btnConfirmMusinsaRedirect: document.getElementById('btn-confirm-musinsa-redirect'),
  musinsaItemName: document.getElementById('musinsa-item-name'),
  pinInteractionGuide: document.getElementById('pin-interaction-guide'),
  tpoScrollContainer: document.getElementById('tpo-scroll-container'),
  tpoScrollHint: document.getElementById('tpo-scroll-hint')
};

// ========================================================
// INITIALIZER & ROUTING
// ========================================================

function init() {
  bindEvents();
  if (localStorage.getItem('fitcheck.tutorialSeen.v2') !== '1') {
    dom.firstVisitGuide.classList.remove('hidden');
  }
  
  // 배틀 모드 쿼리 파라미터 감지 및 처리
  checkBattleQueryParameters();

  if (!state.isBattleMode) {
    selectTpo('일상'); // 일반 모드일 때 디폴트는 일상
  }

  renderRecentChecks();
}

// URL 배틀 쿼리 파라미터 감지기
function checkBattleQueryParameters() {
  const params = new URLSearchParams(window.location.search);
  const opponentScore = params.get('score');
  const opponentTpo = params.get('tpo');

  if (opponentScore && opponentTpo) {
    state.isBattleMode = true;
    state.opponentScore = parseInt(opponentScore, 10);
    state.opponentTpo = opponentTpo;

    // 배틀 도전자 정보 카드 활성화
    if (dom.battleChallengeCard) {
      dom.battleChallengeCard.classList.remove('hidden');
    }
    if (dom.battleTpoBadge) {
      dom.battleTpoBadge.textContent = `상황: ${opponentTpo}`;
    }
    if (dom.opponentScoreDisplay) {
      dom.opponentScoreDisplay.textContent = state.opponentScore.toLocaleString();
    }

    // 대결용 상황(TPO) 칩 강제 선택 및 락 처리
    selectTpo(opponentTpo);
    dom.tpoChips.forEach(chip => {
      chip.disabled = true;
      chip.classList.add('opacity-70', 'cursor-not-allowed');
    });

    // 측정 버튼 배틀 텍스트 변경
    if (dom.btnSubmitScan) {
      const spanEl = dom.btnSubmitScan.querySelector('span');
      if (spanEl) spanEl.textContent = "배틀 측정 시작하기 🥊";
    }
  }
}

// 이벤트 바인딩
function bindEvents() {
  dom.btnCloseFirstVisitGuide.addEventListener('click', () => {
    localStorage.setItem('fitcheck.tutorialSeen.v2', '1');
    dom.firstVisitGuide.classList.add('hidden');
  });

  // 튜토리얼 스와이프 - 현재 슬라이드에 맞춰 도트 인디케이터 갱신
  if (dom.tutorialSlides) {
    dom.tutorialSlides.addEventListener('scroll', () => {
      const slideIndex = Math.round(dom.tutorialSlides.scrollLeft / dom.tutorialSlides.clientWidth);
      dom.tutorialDots.forEach((dot, idx) => {
        dot.classList.toggle('bg-black/20', idx !== slideIndex);
        dot.classList.toggle('bg-black', idx === slideIndex);
        dot.classList.toggle('w-5', idx === slideIndex);
        dot.classList.toggle('w-2', idx !== slideIndex);
      });
    });
  }

  // 1. TPO 칩 클릭
  dom.tpoChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      const tpoValue = e.currentTarget.getAttribute('data-tpo');
      selectTpo(tpoValue);
    });
  });

  // 2. 업로드 영역 클릭 ➔ 파일 인풋 실행 (이벤트 버블링 차단 완료)
  dom.uploadBoxTrigger.addEventListener('click', () => {
    dom.imageFileInput.click();
  });

  // 3. 파일 인풋 변경 처리
  dom.imageFileInput.addEventListener('change', handleCustomFileUpload);

  // 4. 패션력 측정하기 실행
  dom.btnSubmitScan.addEventListener('click', startScanningSequence);

  // 5. 결과창 마진 태그 / 앵커 닷 윈도우 리사이즈 연결선 갱신 바인딩
  window.addEventListener('resize', drawLines);
  dom.btnCloseTooltip.addEventListener('click', hideTooltip);

  // 6. 추천 코디 적용 (Devil 피드백 교체)
  dom.btnApplyAdvice.addEventListener('click', applyStyleAdvice);
  dom.btnAnalysisRetry.addEventListener('click', startScanningSequence);
  dom.btnShowBefore.addEventListener('click', () => showImageVersion('before'));
  dom.btnShowAfter.addEventListener('click', () => showImageVersion('after'));

  // 7. 다시하기 (Retry)
  dom.btnRetry.addEventListener('click', resetToUploadScreen);

  // 8. 인스타 스토리 다운로드 및 모달 트리거
  dom.btnShareStory.addEventListener('click', exportInstagramStory);

  // 9. 배틀 링크 복사
  if (dom.btnCopyLink) dom.btnCopyLink.addEventListener('click', copyBattleLink);

  // TPO 스크롤 - PC 마우스 휠로 수평 스크롤 지원 + 힌트 화살표 숨김
  if (dom.tpoScrollContainer) {
    dom.tpoScrollContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        dom.tpoScrollContainer.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    const updateScrollHint = () => {
      if (!dom.tpoScrollHint) return;
      const el = dom.tpoScrollContainer;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      dom.tpoScrollHint.style.opacity = atEnd ? '0' : '1';
    };
    dom.tpoScrollContainer.addEventListener('scroll', updateScrollHint);
    updateScrollHint();
  }

  // 10. 인스타 바로가기 모달 연동
  if (dom.btnCloseRedirectModal) {
    dom.btnCloseRedirectModal.addEventListener('click', () => {
      dom.instagramRedirectModal.classList.add('hidden');
    });
  }
  if (dom.btnOpenInstagramApp) {
    dom.btnOpenInstagramApp.addEventListener('click', openInstagramApp);
  }
  if (dom.btnShareSystem) {
    dom.btnShareSystem.addEventListener('click', shareSystem);
  }
  if (dom.btnDownloadImage) {
    dom.btnDownloadImage.addEventListener('click', downloadShareImage);
  }

  // 11. 무신사 리다이렉션 컨펌 모달 연동
  if (dom.linkShopping) {
    dom.linkShopping.addEventListener('click', (e) => {
      e.preventDefault();
      if (dom.musinsaItemName) {
        dom.musinsaItemName.textContent = state.targetMusinsaItem;
      }
      if (dom.musinsaRedirectModal) {
        dom.musinsaRedirectModal.classList.remove('hidden');
      }
    });
  }
  if (dom.btnCloseMusinsaModal) {
    dom.btnCloseMusinsaModal.addEventListener('click', () => {
      dom.musinsaRedirectModal.classList.add('hidden');
    });
  }
  if (dom.btnCloseMusinsaModalCancel) {
    dom.btnCloseMusinsaModalCancel.addEventListener('click', () => {
      dom.musinsaRedirectModal.classList.add('hidden');
    });
  }
  if (dom.btnConfirmMusinsaRedirect) {
    dom.btnConfirmMusinsaRedirect.addEventListener('click', () => {
      openMusinsaSearch(state.targetMusinsaUrl);
      dom.musinsaRedirectModal.classList.add('hidden');
    });
  }
}

// ========================================================
// LOGIC IMPLEMENTATION
// ========================================================

// Toast 알림
function showToast(message) {
  dom.toastText.textContent = message;
  dom.appToast.classList.remove('hidden');
  setTimeout(() => {
    dom.appToast.classList.add('hidden');
  }, 2200);
}

// 상황(TPO) 스위치 선택
function selectTpo(tpo) {
  state.selectedTpo = tpo;
  dom.tpoChips.forEach(chip => {
    if (chip.getAttribute('data-tpo') === tpo) {
      chip.classList.add('active-tpo', 'bg-cream', 'neo-shadow');
    } else {
      chip.classList.remove('active-tpo', 'bg-cream', 'neo-shadow');
    }
  });
  playSound('chip');
}

// 커스텀 이미지 파일 업로드 처리
function handleCustomFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(event) {
    // 폰 카메라 원본 사진은 서버의 base64 길이 제한(4.5MB 문자)을 넘기기 쉬워서
    // 분석에 충분한 해상도로 리사이즈/압축 후 사용한다.
    const resizedDataUrl = await resizeImageForUpload(event.target.result);
    state.currentOotdImage = resizedDataUrl;
    state.originalOotdImage = resizedDataUrl;
    state.improvedOotdImage = null;

    // 미리보기 렌더링
    dom.uploadPreviewImg.src = state.currentOotdImage;
    dom.uploadPlaceholder.classList.add('hidden');
    dom.uploadPreviewContainer.classList.remove('hidden');

    // 측정 버튼 활성화
    dom.btnSubmitScan.disabled = false;
    showToast("OOTD 사진이 등록되었습니다! 📸");
    playSound('select');
  };
  reader.readAsDataURL(file);
}

// 업로드 이미지 리사이즈/압축 (분석 API 전송용)
async function resizeImageForUpload(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const maxDimension = 1440;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// API 호출 및 다중 폴백 로직
async function callAnalyzeAPI(imageBase64, tpo, improvementContext = null) {
  let response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, tpo, improvementContext }),
    });
  } catch (error) {
    throw new ApiRequestError(
      'AI_TEMPORARY_UNAVAILABLE',
      'AI 서비스에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.',
      error,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiRequestError(
      payload.code || 'AI_TEMPORARY_UNAVAILABLE',
      payload.error || 'AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    );
  }
  return payload;
}

class ApiRequestError extends Error {
  constructor(code, message, cause) {
    super(message, cause ? { cause } : undefined);
    this.code = code;
  }
}

function aiErrorMessage(error, fallbackSuffix = '') {
  const messages = {
    AI_QUOTA_EXCEEDED: '오늘의 무료 AI 사용량을 모두 사용했어요. 내일 다시 만나요! 🪫',
    AI_SAFETY_BLOCKED: '안전 정책상 이 사진은 처리할 수 없어요. 다른 사진으로 시도해 주세요. 🛡️',
    AI_TEMPORARY_UNAVAILABLE: 'AI가 잠깐 옷장 정리 중이에요. 잠시 후 다시 시도해 주세요. 🧹',
    AI_INVALID_RESPONSE: 'AI 답변표가 살짝 구겨졌어요. 한 번 더 시도해 주세요. 📄',
    AI_CONFIGURATION: 'AI 설정이 아직 완료되지 않았어요. 관리자에게 알려 주세요. ⚙️',
  };
  const message = messages[error?.code] || error?.message || 'AI 요청을 처리하지 못했습니다.';
  return `${message}${fallbackSuffix}`;
}

function startScanningSequence() {
  dom.btnSubmitScan.disabled = true;
  dom.analysisErrorPanel.classList.add('hidden');
  dom.loadingProgressFill.classList.remove('bg-error', 'border-error');
  dom.loadingProgressFill.classList.add('bg-secondary', 'border-black');
  dom.loadingTitle.textContent = 'OOTD 스캐닝 중...';
  
  // 화면 전환 (Upload -> Loading)
  dom.screenUpload.classList.remove('active-screen');
  dom.screenLoading.classList.add('active-screen');
  
  // 상단 통합 헤더 감추기 (트랜잭션 몰입 유도)
  if (dom.appHeader) dom.appHeader.classList.add('hidden');
  
  playSound('scan_start');

  const normalLoadingTexts = [
    "OOTD 실루엣 경계 벡터 추출 중...",
    "상/하의 픽셀 보색 대비 강도 연산 중...",
    "선택 TPO 목적 적합성 딥러닝 감정 중...",
    "안구 스트레스 유발 농도 판독 중...",
    "패션 구조대 출동 여부 결정 중...",
    "스캔 보고서 연성 완료!"
  ];

  const battleLoadingTexts = [
    "상대방 착장 레이아웃 데이터 수신 중...",
    "도전자 OOTD 레이아웃 교차 분해 중...",
    "1:1 픽셀 단위 배틀 시뮬레이션 가동 중...",
    "안구 정화도 대조 검증 연산 중...",
    "배틀 매치 심사 완료! VS 카드 연성 중..."
  ];

  const loadingTexts = state.isBattleMode ? battleLoadingTexts : normalLoadingTexts;

  let currentStep = 0;
  dom.loadingStatusText.textContent = loadingTexts[0];
  dom.loadingProgressFill.style.width = "10%";

  // 2.4초간 400ms 간격으로 상태 메시지와 프로그레스바 증가
  const interval = setInterval(() => {
    currentStep++;
    if (currentStep < loadingTexts.length - 1) { // 마지막 완료 멘트 전까지
      dom.loadingStatusText.textContent = loadingTexts[currentStep];
      dom.loadingProgressFill.style.width = `${15 + (currentStep * 17)}%`;
      playSound('beep');
    }
  }, 400);

  // API 호출 시작
  let apiFailed = false;
  let apiResolved = false;
  let apiError = null;
  
  callAnalyzeAPI(state.currentOotdImage, state.selectedTpo)
    .then(data => {
      state.apiData = data;
      apiResolved = true;
    })
    .catch(err => {
      console.warn("AI analysis failed.", err);
      state.apiData = null;
      apiFailed = true;
      apiError = err;
      apiResolved = true;
    });

  // 최소 2.4초 대기 후 API 상태 체크 및 화면 전환
  setTimeout(() => {
    clearInterval(interval);
    
    const checkCompletion = setInterval(() => {
      if (apiResolved) {
        clearInterval(checkCompletion);
        
        if (apiFailed) {
          dom.loadingTitle.textContent = '분석을 완료하지 못했어요';
          dom.loadingStatusText.textContent = aiErrorMessage(apiError);
          dom.loadingProgressFill.style.width = '100%';
          dom.loadingProgressFill.classList.remove('bg-secondary', 'border-black');
          dom.loadingProgressFill.classList.add('bg-error', 'border-error');
          dom.analysisErrorMessage.textContent = aiErrorMessage(apiError);
          dom.analysisErrorPanel.classList.remove('hidden');
          dom.btnSubmitScan.disabled = false;
          return;
        }

        showToast("AI 분석 완료! 🎯");
        
        dom.loadingStatusText.textContent = loadingTexts[loadingTexts.length - 1]; // "스캔 보고서 연성 완료!"
        dom.loadingProgressFill.style.width = "100%";
        
        setTimeout(() => {
          // 분석 결과창 연산 및 이동
          calculateFashionResults();

          // 결과 화면 진입 시 상단 헤더 다시 노출 (브랜드 브랜딩 및 구조적 안정성)
          if (dom.appHeader) dom.appHeader.classList.remove('hidden');

          dom.screenLoading.classList.remove('active-screen');
          dom.screenResult.classList.add('active-screen');
          playSound('success');
        }, 300);
      } else {
        // 아직 대기 중인 경우 대기 안내 문구 노출 및 펄스 효과
        dom.loadingStatusText.textContent = "AI의 깊이 있는 패션 훈수를 대기 중...";
        dom.loadingProgressFill.style.width = "95%";
      }
    }, 100);
  }, 2400);
}

// 3단계: 결과창 연산
function calculateFashionResults() {
  state.isPatched = false;
  if (!state.apiData) throw new Error('Validated AI analysis data is required.');

  state.score = state.apiData.score;
  state.originalScore = state.apiData.score;
  state.tier = state.apiData.tier;
  state.bestMatches = state.apiData.bestMatches;
  state.worstMatches = state.apiData.worstMatches;
  state.bestMatch = state.bestMatches[0];
  state.worstMatch = state.worstMatches[0];
  state.musinsaQuery = state.apiData.musinsaQuery;
  state.targetMusinsaItem = state.worstMatch.recommendItem;
  state.stats = Object.entries(state.apiData.stats).map(([name, val]) => ({
    name,
    val,
    originalVal: val,
  }));

  // 비주얼 이미지 및 배틀 레이아웃 세팅
  if (state.isBattleMode) {
    // 5:5 분할 매치 화면 연동
    dom.resultOotdImg.classList.add('hidden');
    dom.battleVersusContainer.classList.remove('hidden');
    dom.resultOotdImgChallenger.src = state.currentOotdImage;
    
    // 핀 마커 및 툴팁 감춤
    dom.tagContainer.classList.add('hidden');
    dom.tagLinesSvg.classList.add('hidden');
    dom.feedbackTooltip.classList.add('hidden');
    if (dom.resultTopOverlayBadge) dom.resultTopOverlayBadge.classList.add('hidden');
    if (dom.pinInteractionGuide) dom.pinInteractionGuide.classList.add('hidden');

    // 상대방 스펙 바인딩
    dom.vsOppScore.textContent = `${state.opponentScore.toLocaleString()}점`;
    dom.vsOppTier.textContent = calculateTier(state.opponentScore);

    // 승패 판정에 따른 스탬프 오버레이
    const winStampHTML = `
      <div class="bg-secondary border-[3px] border-black text-black px-4 py-2 font-headline font-black text-base rotate-[12deg] shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase tracking-wider select-none scale-110">
        WIN 🏆
      </div>
    `;
    const loseStampHTML = `
      <div class="bg-[#ffdad6] border-[3px] border-black text-black px-4 py-2 font-headline font-black text-base rotate-[-12deg] shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase tracking-wider select-none scale-110">
        LOSE 💀
      </div>
    `;

    dom.stampOpp.classList.remove('hidden');
    dom.stampChallenger.classList.remove('hidden');

    if (state.score > state.opponentScore) {
      dom.stampChallenger.innerHTML = winStampHTML;
      dom.stampOpp.innerHTML = loseStampHTML;
    } else {
      dom.stampChallenger.innerHTML = loseStampHTML;
      dom.stampOpp.innerHTML = winStampHTML;
    }
  } else {
    // 일반 모드 렌더링
    dom.resultOotdImg.classList.remove('hidden');
    dom.battleVersusContainer.classList.add('hidden');
    dom.resultOotdImg.src = state.currentOotdImage;
    
    // Angel & Devil 핀 배치 및 내용 세팅
    setupPins();
    if (dom.resultTopOverlayBadge) dom.resultTopOverlayBadge.classList.remove('hidden');
    if (dom.pinInteractionGuide) dom.pinInteractionGuide.classList.remove('hidden');
  }

  // 점수판 그리기 및 카운트업
  renderResultDashboard();

  // 최근 패션 체크 기록 저장 (배틀 모드 제외)
  saveRecentCheck();
}

// 핀 마커 포지셔닝 및 코디 세팅 (마진 태그 및 연결선으로 전면 재설계)
function setupPins() {
  dom.feedbackTooltip.classList.add('hidden');
  
  // 기존 동적 요소 제거
  dom.tagContainer.innerHTML = '';
  dom.tagLinesSvg.innerHTML = '';
  
  const bestMatches = state.bestMatches || [];
  const worstMatches = state.worstMatches || [];
  
  // 1. 모든 매칭 요소를 하나의 리스트로 통합하여 가로 위치 기준 분류
  const leftTags = [];
  const rightTags = [];
  
  bestMatches.forEach((match, idx) => {
    const item = { ...match, type: 'angel', originalIndex: idx };
    if (match.x < 50) leftTags.push(item);
    else rightTags.push(item);
  });
  
  worstMatches.forEach((match, idx) => {
    const item = { ...match, type: 'devil', originalIndex: idx };
    if (match.x < 50) leftTags.push(item);
    else rightTags.push(item);
  });
  
  // 2. Y축 충돌 방지 (겹침 예방) 알고리즘 실행
  spaceOutTags(leftTags);
  spaceOutTags(rightTags);
  
  // 3. 태그 및 앵커 닷 렌더링
  const renderTagsForSide = (tags, side) => {
    tags.forEach((tag) => {
      // 3.1. 앵커 닷 (Anchor Dot) 생성 및 배치
      const dot = document.createElement('div');
      dot.className = `anchor-dot anchor-dot-${tag.type} absolute pointer-events-auto`;
      dot.style.left = `${tag.x}%`;
      dot.style.top = `${tag.y}%`;
      dot.style.transform = 'translate(-50%, -50%)';
      dot.dataset.type = tag.type;
      dot.dataset.index = tag.originalIndex;
      
      // 3.2. 태그 버튼 생성
      const button = document.createElement('button');
      button.className = `margin-tag margin-tag-${tag.type} absolute pointer-events-auto px-2 py-1 flex items-center justify-center gap-1`;
      
      // 사용자 요청: "좋은점:", "개선점:" 제거하고 이모지와 키워드만 표시 (예: 😇 블루 셔츠, 😈 블랙 반바지)
      const emoji = tag.type === 'angel' ? '😇' : '😈';
      button.innerHTML = `<span>${emoji}</span> <span class="font-sans font-black">${tag.keyword || tag.name.split(':')[0]}</span>`;
      
      button.style.top = `${tag.displayY}%`;
      if (side === 'left') {
        button.style.left = '4%';
      } else {
        button.style.right = '4%';
      }
      button.dataset.type = tag.type;
      button.dataset.index = tag.originalIndex;
      
      // 이벤트 바인딩
      const clickHandler = () => {
        showPinTooltip(tag.type, tag.originalIndex);
      };
      
      button.addEventListener('click', clickHandler);
      dot.addEventListener('click', clickHandler);
      
      // 호버 연동 (연결선 강조 효과)
      const hoverIn = () => {
        const line = dom.tagLinesSvg.querySelector(`[data-tag-line="${tag.type}-${tag.originalIndex}"]`);
        if (line) line.classList.add('active-line');
        button.classList.add('active-tag');
        dot.classList.add('active-dot');
      };
      const hoverOut = () => {
        // 이미 툴팁으로 활성화된 태그가 아니면 호버 해제
        if (!button.classList.contains('is-selected-active')) {
          const line = dom.tagLinesSvg.querySelector(`[data-tag-line="${tag.type}-${tag.originalIndex}"]`);
          if (line && !line.classList.contains('is-selected-active-line')) {
            line.classList.remove('active-line');
          }
          button.classList.remove('active-tag');
          dot.classList.remove('active-dot');
        }
      };
      
      button.addEventListener('mouseenter', hoverIn);
      button.addEventListener('mouseleave', hoverOut);
      dot.addEventListener('mouseenter', hoverIn);
      dot.addEventListener('mouseleave', hoverOut);
      
      dom.tagContainer.appendChild(dot);
      dom.tagContainer.appendChild(button);
    });
  };
  
  renderTagsForSide(leftTags, 'left');
  renderTagsForSide(rightTags, 'right');
  
  dom.tagContainer.classList.remove('hidden');
  dom.tagLinesSvg.classList.remove('hidden');
  
  // 연결선 실시간 렌더링 호출
  setTimeout(drawLines, 50);
}

// Y축 충돌 방지 정렬 알고리즘
function spaceOutTags(tags) {
  if (tags.length === 0) return;
  // y축 기준으로 정렬
  tags.sort((a, b) => a.y - b.y);
  
  // 각 태그에 최초 displayY 할당
  tags.forEach(tag => {
    tag.displayY = tag.y;
  });
  
  const minDist = 12; // 최소 12% 간격 유지
  for (let i = 1; i < tags.length; i++) {
    if (tags[i].displayY - tags[i-1].displayY < minDist) {
      tags[i].displayY = tags[i-1].displayY + minDist;
    }
  }
  
  // 맨 마지막 태그가 하단 마진(90%)을 넘어가면 위로 밀어올림
  if (tags[tags.length - 1].displayY > 90) {
    const overflow = tags[tags.length - 1].displayY - 90;
    for (let i = tags.length - 1; i >= 0; i--) {
      tags[i].displayY = Math.max(5, tags[i].displayY - overflow);
      if (i < tags.length - 1 && tags[i+1].displayY - tags[i].displayY < minDist) {
        tags[i].displayY = tags[i+1].displayY - minDist;
      }
    }
  }
}

// 실시간 연결선 그리기 (SVG)
function drawLines() {
  if (dom.tagContainer.classList.contains('hidden')) return;
  
  dom.tagLinesSvg.innerHTML = '';
  
  const containerRect = dom.tagContainer.getBoundingClientRect();
  if (containerRect.width === 0 || containerRect.height === 0) return;
  
  const buttons = dom.tagContainer.querySelectorAll('.margin-tag');
  const dots = dom.tagContainer.querySelectorAll('.anchor-dot');
  
  buttons.forEach((btn) => {
    const type = btn.dataset.type;
    const index = btn.dataset.index;
    
    // 일치하는 앵커 닷 찾기
    const dot = Array.from(dots).find(d => d.dataset.type === type && d.dataset.index === index);
    if (!dot) return;
    
    const btnRect = btn.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    
    // 컨테이너 대비 상대 좌표 계산
    const y1 = (btnRect.top + btnRect.height / 2) - containerRect.top;
    const y2 = (dotRect.top + dotRect.height / 2) - containerRect.top;
    
    let x1;
    if (btn.style.left) {
      // 좌측 배치 태그: 태그 버튼의 우측 끝단에서 시작
      x1 = btnRect.right - containerRect.left;
    } else {
      // 우측 배치 태그: 태그 버튼의 좌측 끝단에서 시작
      x1 = btnRect.left - containerRect.left;
    }
    
    const x2 = (dotRect.left + dotRect.width / 2) - containerRect.left;
    
    // SVG Line 요소 생성
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    
    // 클래스 바인딩 및 커스텀 식별자 저장
    const isActive = btn.classList.contains('active-tag');
    line.setAttribute('class', `tag-connection-line tag-connection-line-${type} ${isActive ? 'active-line is-selected-active-line' : ''}`);
    line.dataset.tagLine = `${type}-${index}`;
    
    dom.tagLinesSvg.appendChild(line);
  });
}

// 핀 상세 정보 툴팁 노출
function showPinTooltip(type, index = 0) {
  dom.feedbackTooltip.classList.remove('hidden');
  playSound('select');

  // 모든 태그 및 닷의 하이라이트 상태 초기화
  dom.tagContainer.querySelectorAll('.margin-tag').forEach(btn => {
    btn.classList.remove('active-tag', 'is-selected-active');
  });
  dom.tagContainer.querySelectorAll('.anchor-dot').forEach(dot => {
    dot.classList.remove('active-dot');
  });
  dom.tagLinesSvg.querySelectorAll('.tag-connection-line').forEach(line => {
    line.classList.remove('active-line', 'is-selected-active-line');
  });

  // 현재 선택된 태그와 앵커 닷, 연결선 찾아서 활성화
  const activeBtn = dom.tagContainer.querySelector(`.margin-tag[data-type="${type}"][data-index="${index}"]`);
  const activeDot = dom.tagContainer.querySelector(`.anchor-dot[data-type="${type}"][data-index="${index}"]`);
  const activeLine = dom.tagLinesSvg.querySelector(`[data-tag-line="${type}-${index}"]`);

  if (activeBtn) activeBtn.classList.add('active-tag', 'is-selected-active');
  if (activeDot) activeDot.classList.add('active-dot');
  if (activeLine) activeLine.classList.add('active-line', 'is-selected-active-line');

  if (type === 'angel') {
    dom.tooltipTitle.textContent = "😇 BEST MATCH";
    dom.tooltipTitle.className = "font-headline font-black text-xs uppercase px-2 py-0.5 border-[2px] border-black bg-secondary text-black";
    dom.tooltipContent.textContent = state.bestMatches[index].name;
    
    // Angel은 쇼핑몰 추천 및 코디적용 숨김
    dom.linkShopping.classList.add('hidden');
    dom.btnApplyAdvice.classList.add('hidden');
  } else {
    dom.tooltipTitle.textContent = "😈 WORST MATCH";
    dom.tooltipTitle.className = "font-headline font-black text-xs uppercase px-2 py-0.5 border-[2px] border-black bg-error-container text-black";
    
    const selectedMatch = state.worstMatches[index];
    let comment = selectedMatch.name;
    let query = encodeURIComponent(selectedMatch.recommendItem);

    dom.tooltipContent.textContent = comment;
    state.worstMatch = selectedMatch;
    state.targetMusinsaItem = selectedMatch.recommendItem;
    state.targetMusinsaUrl = `https://www.musinsa.com/search/goods?keyword=${query}`;
    dom.linkShopping.href = "#";
    
    // 개선 전에는 적용 버튼만 노출하고 쇼핑 링크는 개선 완료 후 별도 카드에서 제공한다.
    dom.linkShopping.classList.add('hidden');
    if (state.isPatched) {
      dom.btnApplyAdvice.classList.add('hidden'); // 이미 적용되었으면 감춤
    } else {
      dom.btnApplyAdvice.classList.remove('hidden');
    }
  }

  // 소형 모바일 화면 대응: 피드백 창이 열릴 때 화면 아래로 잘리지 않도록 뷰포트 내로 자동 스크롤 연동
  setTimeout(() => {
    if (dom.feedbackTooltip) {
      dom.feedbackTooltip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 80);
}

function hideTooltip() {
  dom.feedbackTooltip.classList.add('hidden');
  
  // 모든 활성 상태 하이라이트 제거
  dom.tagContainer.querySelectorAll('.margin-tag').forEach(btn => {
    btn.classList.remove('active-tag', 'is-selected-active');
  });
  dom.tagContainer.querySelectorAll('.anchor-dot').forEach(dot => {
    dot.classList.remove('active-dot');
  });
  dom.tagLinesSvg.querySelectorAll('.tag-connection-line').forEach(line => {
    line.classList.remove('active-line', 'is-selected-active-line');
  });
}


function startInlineStyleEdit(recommendItemName) {
  const messages = [
    `${recommendItemName} 코디 시뮬레이션 가동 중...`,
    '얼굴과 포즈는 그대로 잠금 완료 🔒',
    '새 아이템의 핏만 살짝 다듬는 중...',
    '원래 조명과 배경을 단속하는 중...',
    '코디 밸런스에 패션 소금 한 꼬집...',
    '거울 속 새 착장과 눈 맞춤 중...',
    'TPO 심사위원들이 점수 토론 중...',
    '패션력 재측정 준비 중...',
  ];
  let step = 0;
  hideTooltip();
  dom.styleEditStatus.textContent = messages[0];
  dom.styleEditScorePanel.classList.add('hidden');
  dom.styleEditScoreDelta.textContent = '';
  dom.styleEditOverlay.classList.remove('hidden');
  dom.styleEditOverlay.classList.add('flex');
  const interval = setInterval(() => {
    step = (step + 1) % messages.length;
    dom.styleEditStatus.textContent = messages[step];
  }, 1600);

  return () => {
    clearInterval(interval);
    dom.styleEditOverlay.classList.add('hidden');
    dom.styleEditOverlay.classList.remove('flex');
  };
}

function animateInlineScore(from, to) {
  dom.styleEditScorePanel.classList.remove('hidden');
  const delta = to - from;
  dom.styleEditScoreDelta.textContent = delta >= 0 ? `+${delta.toLocaleString()} UP!` : `${delta.toLocaleString()}`;
  dom.styleEditStatus.textContent = delta > 0
    ? '코디 시너지 감지! 패션력이 쫘자작 올라갑니다 ⚡'
    : '새 코디 점수를 꼼꼼하게 반영했어요.';
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / 2800);
      const eased = 1 - ((1 - progress) ** 3);
      dom.styleEditScore.textContent = Math.round(from + ((to - from) * eased)).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else setTimeout(resolve, 700);
    };
    requestAnimationFrame(tick);
  });
}

// 추천 코디 적용 (실시간 Rescoring 및 가상 대체)
async function applyStyleAdvice() {
  if (state.isPatched) return;

  dom.btnApplyAdvice.disabled = true;
  const recommendItemName = state.targetMusinsaItem || "독일군 스니커즈";
  const previousScore = state.score;
  const previousStats = new Map(state.stats.map((stat) => [stat.name, stat.val]));
  const finishLoading = startInlineStyleEdit(recommendItemName);

  try {
    const preparedImage = await prepareImageForStyleEdit(state.currentOotdImage);
    const response = await fetch('/api/apply-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: preparedImage.dataUrl,
        width: preparedImage.originalWidth,
        height: preparedImage.originalHeight,
        recommendation: state.targetMusinsaItem,
        feedback: state.worstMatch?.name || '',
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.image) {
      throw new ApiRequestError(
        payload.code || 'AI_TEMPORARY_UNAVAILABLE',
        payload.error || '이미지 개선에 실패했습니다.',
      );
    }

    const resultImage = state.isBattleMode ? dom.resultOotdImgChallenger : dom.resultOotdImg;
    resultImage.src = payload.image;
    await resultImage.decode();
    state.originalOotdImage ||= state.currentOotdImage;
    state.improvedOotdImage = payload.image;
    state.currentOotdImage = payload.image;

    dom.styleEditStatus.textContent = '새 코디 패션력과 스탯 다시 측정 중...';
    try {
      const analysis = await callAnalyzeAPI(payload.image, state.selectedTpo, {
        item: recommendItemName,
        previousScore,
      });
      applyImprovedAnalysis(analysis, previousStats);
      await animateInlineScore(previousScore, state.score);
    } catch (analysisError) {
      console.warn('Improved image analysis failed.', analysisError);
      resultImage.src = state.originalOotdImage;
      state.currentOotdImage = state.originalOotdImage;
      state.improvedOotdImage = null;
      throw new ApiRequestError(
        'STYLE_RESULT_ANALYSIS_FAILED',
        `${aiErrorMessage(analysisError)} 원본으로 되돌렸어요. 잠시 후 다시 개선해 주세요.`,
      );
    }
    finishLoading();
  } catch (error) {
    finishLoading();
    showToast(aiErrorMessage(error));
    dom.btnApplyAdvice.disabled = false;
    return;
  }

  state.isPatched = true;
  dom.btnApplyAdvice.disabled = false;
  hideTooltip();
  playSound('upgrade');
  dom.tagContainer.classList.add('hidden');
  dom.tagLinesSvg.classList.add('hidden');
  dom.resultTopOverlayTag.textContent = '개선';
  dom.imageVersionToggle.classList.remove('hidden');
  dom.improvedShoppingItem.textContent = recommendItemName;
  dom.improvedShoppingDescription.textContent = state.apiData?.improvementSummary
    || `${recommendItemName}(으)로 갈아입혀 ${state.selectedTpo} 무드와 전체 밸런스가 한층 또렷해졌어요. 문제 아이템은 퇴근 완료!`;
  dom.improvedShoppingLink.href = `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(recommendItemName)}`;
  dom.improvedShoppingCard.classList.remove('hidden');
  dom.pinInteractionGuide.classList.add('hidden');
  showImageVersion('after');
  showToast('코디 적용 완료! BEFORE / AFTER로 변신을 확인해 보세요. ✨');
  saveRecentCheck();
}

function showImageVersion(version) {
  if (!state.improvedOotdImage) return;
  const showBefore = version === 'before';
  dom.resultOotdImg.src = showBefore ? state.originalOotdImage : state.improvedOotdImage;
  dom.btnShowBefore.className = `px-2 py-1 text-[10px] font-black ${showBefore ? 'bg-black text-white' : 'bg-white text-black'}`;
  dom.btnShowAfter.className = `px-2 py-1 text-[10px] font-black ${showBefore ? 'bg-white text-black' : 'bg-secondary text-black'}`;
  dom.resultTopOverlayTag.textContent = showBefore ? '원본' : '개선';
}

function applyImprovedAnalysis(analysis, previousStats) {
  state.apiData = analysis;
  state.score = analysis.score;
  state.tier = analysis.tier;
  state.bestMatches = analysis.bestMatches;
  state.worstMatches = analysis.worstMatches;
  state.bestMatch = analysis.bestMatches[0];
  state.worstMatch = analysis.worstMatches[0];
  state.musinsaQuery = analysis.musinsaQuery;
  state.stats = Object.entries(analysis.stats).map(([name, val]) => ({
    name,
    val,
    originalVal: previousStats.get(name) ?? val,
  }));
  state.isPatched = true;
  dom.resultScoreNum.textContent = state.score.toLocaleString();
  dom.resultTierName.textContent = state.tier;
  dom.resultRoastText.textContent = analysis.roast;
  renderVibeStats();
}

async function prepareImageForStyleEdit(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const maxInputDimension = 496;
  const scale = Math.min(1, maxInputDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.88),
    originalWidth: image.naturalWidth,
    originalHeight: image.naturalHeight,
  };
}

// 점수판 및 스탯 렌더링 총괄
function renderResultDashboard() {
  // 점수 롤링 연출
  dom.resultScoreNum.textContent = "0";
  let currentVal = 0;
  const targetVal = state.score;
  const duration = 1000;
  const stepTime = 16;
  const increment = targetVal / (duration / stepTime);

  const timer = setInterval(() => {
    currentVal += increment;
    if (currentVal >= targetVal) {
      dom.resultScoreNum.textContent = targetVal.toLocaleString();
      clearInterval(timer);
    } else {
      dom.resultScoreNum.textContent = Math.floor(currentVal).toLocaleString();
    }
  }, stepTime);

  // 티어 및 한줄평 텍스트 세팅
  state.tier = calculateTier(state.score);
  dom.resultTierName.textContent = state.tier;
  
  if (state.isBattleMode) {
    // 헤더 배지 변경 (전체 상태 표기)
    if (dom.resultHeaderBadge) {
      if (state.score > state.opponentScore) {
        dom.resultHeaderBadge.textContent = "VICTORY 🎉";
        dom.resultHeaderBadge.className = "bg-secondary border-[2px] border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black rotate-[2deg] text-black";
      } else {
        dom.resultHeaderBadge.textContent = "DEFEAT 🚨";
        dom.resultHeaderBadge.className = "bg-error-container border-[2px] border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black rotate-[-2deg] text-black";
      }
    }

    if (state.score > state.opponentScore) {
      dom.resultRoastText.textContent = `🎉 배틀 승리! 상대방의 밋밋한 착장(점수: ${state.opponentScore.toLocaleString()}점)을 당신의 힙스터 아우라로 완벽하게 제압하고 참교육했습니다. 친구에게 링크를 되돌려주고 승리를 자축하세요! 😎`;
    } else {
      dom.resultRoastText.textContent = `🚨 배틀 패배! 상대방의 견고한 가치관이 깃든 핏(점수: ${state.opponentScore.toLocaleString()}점)에 가로막혀 당신의 OOTD가 대완패를 당했습니다. 추천 코드를 가상 장착하여 복수전을 시작하세요! 😈`;
    }
  } else {
    // 일반 모드에서는 헤더 배지 숨김 (배틀 모드의 승패 표시 전용)
    if (dom.resultHeaderBadge) {
      dom.resultHeaderBadge.classList.add('hidden');
    }
    dom.resultTopOverlayTag.textContent = state.score >= 7000 ? "VOGUE PASS" : "EMERGENCY";
    dom.resultRoastText.textContent = getRoastComment(state.selectedTpo, state.score, state.isPatched);
  }
  
  // 스탯 렌더링
  dom.vibeCheckTitle.textContent = state.isBattleMode ? `바이브 체크 (배틀: ${state.selectedTpo})` : `바이브 체크 (${state.selectedTpo})`;
  renderVibeStats();
}

// 티어 연산
function calculateTier(score) {
  if (score >= 9000) return '패션 챌린저';
  if (score >= 7500) return '다이아몬드';
  if (score >= 6000) return '골드';
  if (score >= 4000) return '실버';
  return '아이언';
}

// ========================================================
// 최근 패션 체크 기록 (IndexedDB - 이 브라우저에만 영구 저장됨)
// ========================================================

function openRecentChecksDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECENT_CHECKS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RECENT_CHECKS_STORE)) {
        request.result.createObjectStore(RECENT_CHECKS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecentCheck() {
  if (state.isBattleMode || !state.apiData) return;
  try {
    state.currentRecordId ||= `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: state.currentRecordId,
      createdAt: state.recordCreatedAt || Date.now(),
      updatedAt: Date.now(),
      tpo: state.selectedTpo,
      score: state.score,
      tier: state.tier,
      isPatched: !!state.isPatched,
      apiData: state.apiData,
      originalImage: state.originalOotdImage,
      improvedImage: state.improvedOotdImage || null,
    };
    state.recordCreatedAt = record.createdAt;

    const db = await openRecentChecksDb();
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(RECENT_CHECKS_STORE, 'readonly');
      const request = tx.objectStore(RECENT_CHECKS_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    const keepIds = new Set([
      record.id,
      ...all
        .filter((item) => item.id !== record.id)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, RECENT_CHECKS_LIMIT - 1)
        .map((item) => item.id),
    ]);

    await new Promise((resolve, reject) => {
      const tx = db.transaction(RECENT_CHECKS_STORE, 'readwrite');
      const store = tx.objectStore(RECENT_CHECKS_STORE);
      store.put(record);
      all.forEach((item) => {
        if (!keepIds.has(item.id)) store.delete(item.id);
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    renderRecentChecks();
  } catch (error) {
    console.warn('Recent check could not be saved.', error);
  }
}

async function loadRecentChecks() {
  try {
    const db = await openRecentChecksDb();
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(RECENT_CHECKS_STORE, 'readonly');
      const request = tx.objectStore(RECENT_CHECKS_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_CHECKS_LIMIT);
  } catch (error) {
    console.warn('Recent checks could not be loaded.', error);
    return [];
  }
}

async function renderRecentChecks() {
  const records = await loadRecentChecks();
  if (!dom.recentChecksList || !dom.recentChecksCard) return;
  dom.recentChecksList.innerHTML = '';

  records.forEach((record) => {
    const thumb = record.improvedImage || record.originalImage;
    const date = new Date(record.updatedAt || record.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });

    const card = document.createElement('div');
    card.className = 'flex items-center gap-3 bg-white border-[3px] border-black neo-shadow p-2 cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all';
    card.innerHTML = `
      <div class="w-16 h-16 shrink-0 border-[2px] border-black bg-[#eeeeee] overflow-hidden">
        <img src="${thumb}" alt="최근 패션 체크" class="w-full h-full object-cover">
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-headline text-sm font-black truncate">${record.tpo} · ${record.tier}${record.isPatched ? ' · 개선' : ''}</p>
        <p class="text-[10px] font-bold text-on-surface-variant">${date}</p>
      </div>
      <strong class="font-headline text-lg font-black shrink-0">${record.score.toLocaleString()}</strong>
    `;
    card.addEventListener('click', () => restoreRecentCheck(record));
    dom.recentChecksList.appendChild(card);
  });

  dom.recentChecksCard.classList.toggle('hidden', records.length === 0);
}

function restoreRecentCheck(record) {
  state.isBattleMode = false;
  state.currentRecordId = record.id;
  state.recordCreatedAt = record.createdAt;

  if (!record.improvedImage) {
    // 개선(before/after)을 적용하지 않은 기록은 캐시로 때우지 않고,
    // 저장된 사진으로 실제 재측정을 수행해 Cloudflare Worker를 다시 다녀온다.
    state.currentOotdImage = record.originalImage;
    state.originalOotdImage = record.originalImage;
    state.improvedOotdImage = null;
    state.apiData = null;
    dom.uploadPreviewImg.src = record.originalImage;
    dom.uploadPlaceholder.classList.add('hidden');
    dom.uploadPreviewContainer.classList.remove('hidden');
    dom.btnSubmitScan.disabled = false;
    selectTpo(record.tpo);
    startScanningSequence();
    return;
  }

  // 개선까지 마친 기록은 저장된 스냅샷(분석 결과 + 사진)을 그대로 복원
  state.selectedTpo = record.tpo;
  state.apiData = record.apiData;
  state.originalOotdImage = record.originalImage;
  state.improvedOotdImage = record.improvedImage;
  state.currentOotdImage = record.improvedImage;

  calculateFashionResults();

  state.isPatched = true;
  if (dom.imageVersionToggle) dom.imageVersionToggle.classList.remove('hidden');
  if (dom.resultTopOverlayTag) dom.resultTopOverlayTag.textContent = '개선';

  if (dom.appHeader) dom.appHeader.classList.remove('hidden');
  dom.screenUpload.classList.remove('active-screen');
  dom.screenResult.classList.add('active-screen');
  playSound('select');
}

// 스탯별 위트있는 상세 설명 데이터베이스
const statDescriptions = {
  // 일상
  '색상 불협화음 🎨': "상/하의 색 조합이 보색 관계거나 채도가 너무 튀면 올라갑니다. 낮아야 눈이 편안해요.",
  '안구 보호도 👁️': "당신의 패션이 주변 사람들의 시력을 얼마나 보호해 줬는지 나타내는 이타적인 지표입니다.",
  '근자감 농도 ⚡': "이 옷을 입고 명동 벌판을 얼마나 뻔뻔하게 활보할 수 있는지 나타냅니다.",
  '지갑 방어력 💸': "소비된 아이템들의 가성비 지수. SPA 위주면 90% 이상, 명품 믹스면 낮아집니다.",
  '마실 적합도 ☕': "동네 메가커피나 편의점에 갈 때 지나치게 힘을 주지 않았는지 측정합니다.",
  // 데이트
  '설렘 유발 지수 💘': "첫눈에 호감을 사고 썸 탈 확률을 늘려주는 데이트 성공의 척도.",
  '과도한 격식도 🕴️': "마치 면접 보러 온 것처럼 각 잡힌 무거운 룩인지 판독합니다. (낮아야 로맨틱)",
  '센스 스포일러 🕶️': "악세서리, 양말 색 등 드러나지 않는 한 끗 차이의 디테일 센스.",
  '호감도 파괴력 💔': "보는 이의 연애 세포를 잠재우는 끔찍한 단품 아이템의 존재율 (낮을수록 좋음).",
  '데이트 생존율 🧬': "오늘 데이트 후 삼겹살 먹다 체하지 않고 다음 애프터에 성공할 시뮬레이션 지수.",
  // 출근
  '부장님 눈총 지수 😒': "부장님의 등 뒤 레이저 가동률. 튀거나 성의 없어 보일수록 치솟습니다.",
  '프로페셔널 지수 💼': "일은 기획서 마감 직전인데 패션만은 실리콘밸리 CEO 뺨치는 전문성 연출도.",
  '활동성 방해율 🏃': "이 옷을 입고 하루 종일 엑셀 노가다와 탕비실 커피 배달이 가능한가에 대한 지표.",
  '퇴근 본능 자극도 ⏰': "옷이 너무 불편하거나 너무 편해 당장 퇴근하고 싶어지는 본능 유도율.",
  '평판 수호 지수 🛡️': "사내 복장 불량 지적을 방어하고 패셔니스타 평판을 지켜내는 방어율.",
  // 운동
  '헬창 아우라 지수 🏋️': "3대 운동 몇 치는지와 상관없이 헬스장 바닥을 지배하는 고수 느낌.",
  '거울 셀카 득표율 📸': "오운완 해시태그 박아 올렸을 때 인스타 하트를 땡겨올 확률.",
  '땀 배출 지연도 💦': "통풍이 전혀 안 되어 겨드랑이 홍수 폭발을 유발하는 기능성 상실율.",
  '신체 보정 치트 📐': "어깨가 넓어 보이거나 다리가 길어 보이게 숨겨진 체형 사기 지수.",
  '근손실 위장도 🧬': "핏 때문에 실제로 만든 근육마저 쪼그라들어 보이는 억울함 방어 지수.",
  // 하객
  '신부 저격 민폐도 🏹': "흰색 민폐룩이나 지나치게 화려하여 신랑 신부의 존재를 묻어버리는 지수.",
  '하객 격식 비율 🤝': "결혼식을 축하하기 위해 나이와 자리에 알맞게 성의를 보인 척도.",
  '사진 생존율 📸': "맨 뒤 구석 단체 샷에서도 깔끔하게 존재감을 발휘하는 룩.",
  '피로연 프리패스 🍽️': "식사 도중 바지 후크를 풀지 않고 피로연 뷔페 5접시를 채울 수 있는 신축성 지수.",
  '친척 잔소리 실드 🛡️': "오랜만에 만난 친척들의 잔소리('결혼은 언제 하니')를 물리치는 단정함의 힘."
};

// 상황별 스탯 데이터 생성 및 렌더링
function renderVibeStats() {
  const tpo = state.selectedTpo;
  
  if (!state.apiData) {
    const statsMapping = {
      '일상': [
        { name: '색상 불협화음 🎨', val: getMutedStatVal(100 - (state.score/105), 15, 95), originalVal: Math.floor(100 - (state.originalScore/105)) },
        { name: '안구 보호도 👁️', val: getMutedStatVal(state.score/100, 20, 99), originalVal: Math.floor(state.originalScore/100) },
        { name: '근자감 농도 ⚡', val: getMutedStatVal(45 + (state.score/200), 30, 98), originalVal: Math.floor(45 + (state.originalScore/200)) },
        { name: '지갑 방어력 💸', val: getMutedStatVal(100 - (state.score/120), 10, 95), originalVal: Math.floor(100 - (state.originalScore/120)) },
        { name: '마실 적합도 ☕', val: getMutedStatVal(state.score/100 - 5, 20, 98), originalVal: Math.floor(state.originalScore/100 - 5) }
      ],
      '데이트': [
        { name: '설렘 유발 지수 💘', val: getMutedStatVal(state.score/95, 25, 99), originalVal: Math.floor(state.originalScore/95) },
        { name: '과도한 격식도 🕴️', val: getMutedStatVal(110 - (state.score/100), 10, 90), originalVal: Math.floor(110 - (state.originalScore/100)) },
        { name: '센스 스포일러 🕶️', val: getMutedStatVal(state.score/102, 15, 98), originalVal: Math.floor(state.originalScore/102) },
        { name: '호감도 파괴력 💔', val: getMutedStatVal(100 - (state.score/100), 5, 95), originalVal: Math.floor(100 - (state.originalScore/100)) },
        { name: '데이트 생존율 🧬', val: getMutedStatVal(state.score/98, 20, 99), originalVal: Math.floor(state.originalScore/98) }
      ],
      '출근': [
        { name: '부장님 눈총 지수 😒', val: getMutedStatVal(105 - (state.score/98), 10, 95), originalVal: Math.floor(105 - (state.originalScore/98)) },
        { name: '프로페셔널 지수 💼', val: getMutedStatVal(state.score/100, 20, 98), originalVal: Math.floor(state.originalScore/100) },
        { name: '활동성 방해율 🏃', val: getMutedStatVal(100 - (state.score/110), 15, 90), originalVal: Math.floor(100 - (state.originalScore/110)) },
        { name: '퇴근 본능 자극도 ⏰', val: getMutedStatVal(40 + (state.score/200), 20, 98), originalVal: Math.floor(40 + (state.originalScore/200)) },
        { name: '평판 수호 지수 🛡️', val: getMutedStatVal(state.score/100 + 5, 30, 99), originalVal: Math.floor(state.originalScore/100 + 5) }
      ],
      '운동': [
        { name: '헬창 아우라 지수 🏋️', val: getMutedStatVal(state.score/100, 15, 98), originalVal: Math.floor(state.originalScore/100) },
        { name: '거울 셀카 득표율 📸', val: getMutedStatVal(state.score/95, 10, 99), originalVal: Math.floor(state.originalScore/95) },
        { name: '땀 배출 지연도 💦', val: getMutedStatVal(100 - (state.score/105), 10, 90), originalVal: Math.floor(100 - (state.originalScore/105)) },
        { name: '신체 보정 치트 📐', val: getMutedStatVal(state.score/100 + 8, 25, 99), originalVal: Math.floor(state.originalScore/100 + 8) },
        { name: '근손실 위장도 🧬', val: getMutedStatVal(state.score/98, 30, 98), originalVal: Math.floor(state.originalScore/98) }
      ],
      '하객': [
        { name: '신부 저격 민폐도 🏹', val: getMutedStatVal(100 - (state.score/100), 5, 95), originalVal: Math.floor(100 - (state.originalScore/100)) },
        { name: '하객 격식 비율 🤝', val: getMutedStatVal(state.score/98, 30, 99), originalVal: Math.floor(state.originalScore/98) },
        { name: '사진 생존율 📸', val: getMutedStatVal(state.score/102, 20, 98), originalVal: Math.floor(state.originalScore/102) },
        { name: '피로연 프리패스 🍽️', val: getMutedStatVal(90 - (state.score/200), 40, 99), originalVal: Math.floor(90 - (state.originalScore/200)) },
        { name: '친척 잔소리 실드 🛡️', val: getMutedStatVal(state.score/100 + 10, 20, 99), originalVal: Math.floor(state.originalScore/100 + 10) }
      ]
    };
    state.stats = statsMapping[tpo] || statsMapping['일상'];
  }

  dom.statsContainer.innerHTML = '';
  
  state.stats.forEach((stat, idx) => {
    // 5대 교차 컬러 배치 (Lavender, Mint, Peach, Cream, Deep Lavender)
    const colorClasses = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-cream', 'bg-[#c9c1ff]'];
    const barColor = colorClasses[idx % colorClasses.length];
    const delta = stat.val - stat.originalVal;
    const baseline = Math.min(stat.originalVal, stat.val);
    const change = Math.abs(delta);
    const changeBarClass = delta > 0 ? 'bg-[#3182F6]' : 'bg-error';
    const changeTextClass = delta > 0 ? 'text-[#3182F6]' : 'text-error';
    const changeLabel = delta
      ? `${delta > 0 ? '+' : ''}${delta} ${delta > 0 ? 'UP!' : 'DOWN!'}`
      : '';

    const statItem = document.createElement('div');
    statItem.className = "flex flex-col gap-1 cursor-pointer group w-full";
    statItem.innerHTML = `
      <div class="flex items-center gap-2 w-full hover:translate-x-[2px] transition-transform">
        <span class="w-24 font-bold text-xs uppercase tracking-tight text-black">${stat.name}</span>
        <div class="flex-1 h-5 border-[3px] border-black bg-white flex overflow-hidden">
          <div class="stat-bar-base ${barColor} h-full transition-all duration-700" style="width: 0%;"></div>
          <div class="stat-bar-gain ${changeBarClass} h-full transition-all duration-700" style="width: 0%;"></div>
        </div>
        <span class="w-14 text-right text-xs font-headline font-black text-black">${stat.val}%${change ? `<small class="block text-[8px] ${changeTextClass}">${changeLabel}</small>` : ''}</span>
      </div>
      <div class="stat-desc-container hidden w-full"></div>
    `;

    // 탭하여 스탯별 설명 팝업/토글 바인딩
    statItem.addEventListener('click', () => {
      const descContainer = statItem.querySelector('.stat-desc-container');
      const isHidden = descContainer.classList.contains('hidden');
      
      // 먼저 열려 있는 모든 다른 스탯 설명 닫기
      document.querySelectorAll('.stat-desc-container').forEach(el => el.classList.add('hidden'));
      
      if (isHidden) {
        const descText = statDescriptions[stat.name] || "상세 설명 정보가 없습니다.";
        descContainer.innerHTML = `
          <div class="text-[10px] font-bold bg-cream border-[2px] border-black p-2 mt-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black rotate-[-0.5deg]">
            💬 ${descText}
          </div>
        `;
        descContainer.classList.remove('hidden');
        playSound('select');
      } else {
        descContainer.classList.add('hidden');
      }
    });
    
    dom.statsContainer.appendChild(statItem);
    
    // 약간의 딜레이 후 애니메이션 차오르게 조정
    setTimeout(() => {
      const baseEl = statItem.querySelector('.stat-bar-base');
      const gainEl = statItem.querySelector('.stat-bar-gain');
      if (baseEl) baseEl.style.width = `${baseline}%`;
      if (gainEl) gainEl.style.width = `${change}%`;
    }, 50);
  });
}

// 스탯 백분율 안정화 도우미
function getMutedStatVal(formulaVal, min, max) {
  let val = Math.floor(formulaVal);
  return Math.max(min, Math.min(max, val));
}

// 상황별 매운맛 한줄평 딕셔너리 연동
function getRoastComment(tpo, score, isPatched) {
  if (isPatched) {
    return "🎉 훌륭합니다! 워스트 부위를 트렌디한 아이템으로 코디 대체하자마자 착장 밸런스가 한층 안정되었습니다. 안구 정화 완료! 😎";
  }

  const roastComments = {
    '일상': {
      challenger: "걸어 다니는 스트릿 화보 그 자체. 동네 마실이 아니라 밀라노 패션위크 런웨이 수준이군요!",
      elite: "상당히 트렌디하고 정갈하네요. 군더더기 없이 조화가 좋은 고감도 데일리 착장입니다.",
      silver: "나쁘진 않지만, 길거리에 널린 흔한 크론 인간 4호 같은 느낌. 개성을 한 스푼 더 얹어보세요.",
      iron: "차라리 옷을 입지 않는 것이 패션 아레나의 평화와 인류의 시각 보호를 위해 이로울지도 문지릅니다."
    },
    '데이트': {
      challenger: "상대방의 동공 지진 완료. 설렘 지수가 한계를 돌파했습니다. 오늘 고백 성공률 99.9%!",
      elite: "센스 넘치고 호감도가 급상승하는 룩. 적절한 악세서리와 조화로운 톤온톤 매칭이 돋보입니다.",
      silver: "지나치게 평범하고 안전제일주의 코디. 첫인상에 강렬함을 주기엔 너무 싱거운 국물 같습니다.",
      iron: "상대방이 밥만 먹고 '갑자기 급한 회사 업무가 생겼다'며 30분 만에 도망치기 딱 좋은 재난형 착장."
    },
    '출근': {
      challenger: "부장님도 사장님도 옷깃을 여미며 예의를 차릴 고품격 비즈니스 웨어. 당장 사내 패션 대표로 취임하세요.",
      elite: "단정함과 스마트함을 겸비한 정석 오피스 코디. 신뢰감 주는 미니멀한 구성이 일 처리를 잘해보이게 합니다.",
      silver: "전형적인 월요일 아침 야근에 지친 직장인 룩. 생존을 위해 대충 걸치고 나온 느낌이 강합니다.",
      iron: "부장님 돋보기안경 긴급 장착! 복장 단속 사내 공지에 워스트 대표 예시로 캡처 박히기 딱 좋습니다."
    },
    '운동': {
      challenger: "스쿼트 덤벨 따위 안 들어도 3대 500 헬창들의 리스펙 시선이 꽂히는 무결점 애슬레저 핏.",
      elite: "피트니스 클럽 거울 셀카 득표율 90% 이상 예상. 기능성과 간지를 동시에 챙긴 훌륭한 짐웨어.",
      silver: "운동은 열심히 하는 것 같은데 옷태가 묻히는 아쉬운 착장. 동네 약수터 산책 감성에 가깝습니다.",
      iron: "이 바지에 이 신발은 패션 근손실이 120% 일어난 참사. 거울에 비친 본인 모습 보고 기겁 요망."
    },
    '하객': {
      challenger: "신랑 신부 옆에서 너무 단정하면서도 광채가 나서, 사진 기사님이 줌인을 당길까 겁나는 명품 하객 룩.",
      elite: "결혼식장 TPO 예의의 표본. 신부를 가리지 않으면서도 세련된 클래식 무드가 단연 돋보입니다.",
      silver: "격식은 갖췄는데 지나치게 답답하거나 올드해 보입니다. 친척들의 잔소리가 귓전을 스칠 우려 농후.",
      iron: "흰색 수트를 뒤덮어 신부 시선을 강탈하는 민폐 하객 테러리스트. 뷔페 식권 회수 및 퇴출 조치가 시급합니다."
    }
  };

  const currentRoast = roastComments[tpo] || roastComments['일상'];

  if (score >= 9000) return `🔥 ${currentRoast.challenger}`;
  if (score >= 7500) return `✨ ${currentRoast.elite}`;
  if (score >= 5000) return `⚠️ ${currentRoast.silver}`;
  return `🚨 ${currentRoast.iron}`;
}

// 다시 시작하기 (Retry)
function resetToUploadScreen() {
  state.currentOotdImage = null;
  state.originalOotdImage = null;
  state.improvedOotdImage = null;
  state.score = 0;
  state.isPatched = false;
  state.apiData = null; // API 데이터 리셋
  state.currentRecordId = null;
  state.recordCreatedAt = null;
  dom.imageVersionToggle.classList.add('hidden');
  dom.improvedShoppingCard.classList.add('hidden');
  dom.styleEditOverlay.classList.add('hidden');
  dom.styleEditOverlay.classList.remove('flex');
  dom.analysisErrorPanel.classList.add('hidden');
  
  // 핀 복원 및 클릭 리스너 청소
  dom.tagContainer.innerHTML = '';
  dom.tagLinesSvg.innerHTML = '';
  dom.tagContainer.classList.add('hidden');
  dom.tagLinesSvg.classList.add('hidden');
  
  // 배틀 상태 해제 및 URL 클리닝
  if (state.isBattleMode) {
    state.isBattleMode = false;
    state.opponentScore = 0;
    
    // URL 쿼리 파라미터 클리닝
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // TPO 칩 활성화 상태 복구
    dom.tpoChips.forEach(chip => {
      chip.disabled = false;
      chip.classList.remove('opacity-70', 'cursor-not-allowed');
    });
    
    // 배틀 카드 숨기기
    if (dom.battleChallengeCard) {
      dom.battleChallengeCard.classList.add('hidden');
    }
    
    // 헤더 배지 숨김 (배틀 모드의 승패 표시 전용)
    if (dom.resultHeaderBadge) {
      dom.resultHeaderBadge.classList.add('hidden');
    }

    // 버튼 텍스트 복구
    if (dom.btnSubmitScan) {
      const spanEl = dom.btnSubmitScan.querySelector('span');
      if (spanEl) spanEl.textContent = "패션력 측정하기";
    }
  }

  // 버튼 비활성화
  dom.btnSubmitScan.disabled = true;

  // 미리보기 리셋
  dom.uploadPreviewContainer.classList.add('hidden');
  dom.uploadPlaceholder.classList.remove('hidden');
  dom.uploadPreviewImg.src = "";
  dom.imageFileInput.value = "";

  // 상단 통합 헤더 노출
  if (dom.appHeader) dom.appHeader.classList.remove('hidden');

  // 화면 전환 (Result -> Upload)
  dom.screenResult.classList.remove('active-screen');
  dom.screenUpload.classList.add('active-screen');
  playSound('retry');
}

// ========================================================
// 5단계: HTML5 CANVAS INSTAGRAM STORY EXPORTER
// ========================================================

async function exportInstagramStory() {
  const canvas = dom.instagramExportCanvas;
  const ctx = canvas.getContext('2d');
  
  // 로딩 알림 Toast 노출
  showToast("인스타 스토리 공유 카드 생성 중... 🎨");

  // 1. 배경 그라데이션 그리기 (Neo-Brutalist 힙한 연보라 대각선 그라데이션)
  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
  grad.addColorStop(0, '#eae6ff'); // Lavender
  grad.addColorStop(1, '#ffefea'); // Peach
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. 외곽 15px 두꺼운 블랙 보더 라인
  ctx.lineWidth = 30;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(0, 0, 1080, 1920);

  // 3. 타이틀 텍스트 그리기 (Montserrat 스타일 볼드 블랙)
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 80px Montserrat, sans-serif';
  ctx.fillText(state.isBattleMode ? 'FITCHECK! BATTLE' : 'FITCHECK! VERDICT', 540, 150);

  // 4. OOTD 사진 그리기 (일반 모드는 1:1, 배틀 모드는 5:5 분할 드로잉)
  const imgElement = state.isBattleMode ? dom.resultOotdImgChallenger : dom.resultOotdImg;
  const imgWidth = 650;
  const imgHeight = 650;
  const imgX = (1080 - imgWidth) / 2; // 215
  const imgY = 240;

  // 4-1. 사진 아래 15px 블랙 그림자 사각형
  ctx.fillStyle = '#000000';
  ctx.fillRect(imgX + 15, imgY + 15, imgWidth, imgHeight);

  if (state.isBattleMode) {
    // === 배틀 모드: 5:5 좌우 분할 드로잉 ===
    const halfW = imgWidth / 2; // 325

    // [왼쪽: 상대방 정보 카드]
    ctx.fillStyle = '#fff9e6'; // Cream background for opponent
    ctx.fillRect(imgX, imgY, halfW, imgHeight);

    // 상대방 실루엣 원 그리기
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(imgX + 162.5, imgY + 180, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 👤 이모지 그리기
    ctx.fillStyle = '#000000';
    ctx.font = '80px Lexend, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', imgX + 162.5, imgY + 180);

    // OPPONENT 배너
    ctx.fillStyle = '#000000';
    ctx.fillRect(imgX + 62.5, imgY + 280, 200, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Montserrat, sans-serif';
    ctx.fillText('OPPONENT', imgX + 162.5, imgY + 305);

    // 상대방 점수
    ctx.fillStyle = '#000000';
    ctx.font = '900 42px Montserrat, sans-serif';
    ctx.fillText(`${state.opponentScore.toLocaleString()} PTS`, imgX + 162.5, imgY + 390);

    // 상대방 티어
    ctx.fillStyle = '#47464c';
    ctx.font = 'bold 22px Lexend, sans-serif';
    ctx.fillText(calculateTier(state.opponentScore), imgX + 162.5, imgY + 440);

    // [오른쪽: 도전자 내 이미지]
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(imgX + halfW, imgY, halfW, imgHeight);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const naturalWidth = imgElement.naturalWidth || imgElement.width || halfW;
    const naturalHeight = imgElement.naturalHeight || imgElement.height || imgHeight;

    let drawW = halfW;
    let drawH = imgHeight;
    let offsetX = 0;
    let offsetY = 0;

    const containerRatio = halfW / imgHeight;
    const imgRatio = naturalWidth / naturalHeight;

    if (imgRatio > containerRatio) {
      drawH = halfW / imgRatio;
      offsetY = (imgHeight - drawH) / 2;
    } else {
      drawW = imgHeight * imgRatio;
      offsetX = (halfW - drawW) / 2;
    }

    ctx.drawImage(imgElement, imgX + halfW + offsetX, imgY + offsetY, drawW, drawH);

    // 분할선 그리기
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(imgX + halfW, imgY);
    ctx.lineTo(imgX + halfW, imgY + imgHeight);
    ctx.stroke();

    // 외곽 보더라인 그리기
    ctx.lineWidth = 10;
    ctx.strokeRect(imgX, imgY, imgWidth, imgHeight);

    // 승패 캔버스 도장 드로잉
    function drawCanvasStamp(centerX, centerY, text, isWin) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(isWin ? 12 * Math.PI / 180 : -12 * Math.PI / 180);
      
      ctx.font = '900 36px Montserrat, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const rectW = textWidth + 40;
      const rectH = 65;
      
      // Shadow
      ctx.fillStyle = '#000000';
      ctx.fillRect(-rectW/2 + 6, -rectH/2 + 6, rectW, rectH);
      
      // Border & Background
      ctx.fillStyle = isWin ? '#e2f4eb' : '#ffdad6'; // Mint or Salmon
      ctx.fillRect(-rectW/2, -rectH/2, rectW, rectH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(-rectW/2, -rectH/2, rectW, rectH);
      
      // Text
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 3);
      
      ctx.restore();
    }

    if (state.score > state.opponentScore) {
      drawCanvasStamp(imgX + 162.5, imgY + 520, 'LOSE 💀', false);
      drawCanvasStamp(imgX + 487.5, imgY + 520, 'WIN 🏆', true);
    } else {
      drawCanvasStamp(imgX + 162.5, imgY + 520, 'WIN 🏆', true);
      drawCanvasStamp(imgX + 487.5, imgY + 520, 'LOSE 💀', false);
    }

  } else {
    // === 일반 모드: 단일 이미지 드로잉 ===
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(imgX, imgY, imgWidth, imgHeight);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const naturalWidth = imgElement.naturalWidth || imgElement.width || imgWidth;
    const naturalHeight = imgElement.naturalHeight || imgElement.height || imgHeight;

    let drawW = imgWidth;
    let drawH = imgHeight;
    let offsetX = 0;
    let offsetY = 0;

    const containerRatio = imgWidth / imgHeight;
    const imgRatio = naturalWidth / naturalHeight;

    if (imgRatio > containerRatio) {
      drawH = imgWidth / imgRatio;
      offsetY = (imgHeight - drawH) / 2;
    } else {
      drawW = imgHeight * imgRatio;
      offsetX = (imgWidth - drawW) / 2;
    }

    ctx.drawImage(imgElement, imgX + offsetX, imgY + offsetY, drawW, drawH);

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(imgX, imgY, imgWidth, imgHeight);
  }

  // 5. 점수 및 등급 텍스트 합성
  // 점수 백그라운드 스티커 박스
  ctx.fillStyle = '#fff9e6'; // Cream
  ctx.fillRect(215, 930, 650, 160);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(215, 930, 650, 160);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (state.isBattleMode) {
    ctx.font = '900 52px Montserrat, sans-serif';
    ctx.fillText(`BATTLE ${state.score > state.opponentScore ? 'VICTORY 🏆' : 'DEFEAT 💀'}`, 540, 1000);
    
    ctx.font = 'bold 32px Lexend, sans-serif';
    ctx.fillText(`상대방: ${state.opponentScore.toLocaleString()}점 VS 나: ${state.score.toLocaleString()}점`, 540, 1055);
  } else {
    ctx.font = '900 64px Montserrat, sans-serif';
    ctx.fillText(`${state.score.toLocaleString()} / 10,000 PTS`, 540, 1005);
    
    ctx.font = 'bold 36px Lexend, sans-serif';
    ctx.fillText(`상황: ${state.selectedTpo} | 티어: ${state.tier}`, 540, 1060);
  }

  // 6. 뼈 때리는 한줄평 멘트 (멀티라인 드로잉 처리)
  ctx.fillStyle = '#ffefea'; // Peach
  ctx.fillRect(115, 1130, 850, 180);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(115, 1130, 850, 180);

  ctx.fillStyle = '#000000';
  ctx.font = 'italic bold 28px Lexend, sans-serif';
  ctx.textAlign = 'left';
  
  const roastWords = dom.resultRoastText.textContent;
  wrapText(ctx, roastWords, 150, 1195, 780, 42);

  // 7. 5대 스탯 바차트 합성
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = '900 32px Montserrat, sans-serif';
  ctx.fillText('VIBE CHECK SPECS', 540, 1375);

  const startStatY = 1430;
  const colors = ['#eae6ff', '#e2f4eb', '#ffefea', '#fff9e6', '#ffffff'];

  state.stats.forEach((stat, idx) => {
    const curY = startStatY + (idx * 75);
    
    // 스탯 이름
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px Lexend, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.name, 140, curY + 22);

    // 스탯 바 테두리
    const barWidth = 550;
    const barHeight = 32;
    ctx.strokeRect(360, curY, barWidth, barHeight);
    
    // 스탯 차오르는 바 그리기
    ctx.fillStyle = colors[idx % colors.length];
    const fillWidth = (stat.val / 100) * barWidth;
    ctx.fillRect(360, curY, fillWidth, barHeight);
    ctx.strokeRect(360, curY, fillWidth, barHeight);

    // 스탯 백분율 수치
    ctx.fillStyle = '#000000';
    ctx.font = '900 24px Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${stat.val}%`, 1000, curY + 24);
  });

  // 8. 풋터 마크 로고
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px Lexend, sans-serif';
  ctx.fillText(state.isBattleMode ? '대결을 수락하고 덤벼라! @team.letsgo_fit' : '내 친구들은 몇점? @team.letsgo_fit', 540, 1850);

  // 9. 최종 공유 카드는 사진, 점수, 상황, 티어와 팀 소개만 간결하게 담는다.
  let shareImage = state.isBattleMode ? dom.resultOotdImgChallenger : dom.resultOotdImg;
  if (!state.isBattleMode && state.improvedOotdImage) {
    shareImage = new Image();
    shareImage.src = state.improvedOotdImage;
    await shareImage.decode();
  }
  drawFinalShareCard(ctx, canvas, shareImage, roastWords);

  // 10. 이미지 공유 준비 및 모달 오픈
  setTimeout(async () => {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      state.shareImageDataUrl = dataUrl;
      
      // 모달에 미리보기 이미지 설정
      if (dom.instagramPreviewImg) {
        dom.instagramPreviewImg.src = dataUrl;
      }

      // Canvas -> Blob -> File 변환 (Web Share API용)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `fitcheck_ootd_${state.score}.png`, { type: 'image/png' });
        state.shareImageFile = file;

        // Web Share API 파일 전송 지원 여부 체크
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          if (dom.btnShareSystem) dom.btnShareSystem.classList.remove('hidden');
        } else {
          if (dom.btnShareSystem) dom.btnShareSystem.classList.add('hidden');
        }
      } else {
        if (dom.btnShareSystem) dom.btnShareSystem.classList.add('hidden');
      }

      // 모달 오버레이 오픈 (사용자 인스타 연동 UX)
      if (dom.instagramRedirectModal) {
        dom.instagramRedirectModal.classList.remove('hidden');
      }
    } catch (err) {
      console.error("Canvas export failed", err);
      showToast("이미지 렌더링에 실패했습니다. (CORS 보안 설정 우려)");
    }
  }, 100);
}

function drawFinalShareCard(ctx, canvas, image, roastWords) {
  canvas.width = 1080;
  canvas.height = 1920;

  // 1. 이미지를 캔버스 전체에 꽉 채워 그리기 (cover 방식)
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const canvasW = 1080;
  const canvasH = 1920;
  const imgRatio = sourceWidth / sourceHeight;
  const canvasRatio = canvasW / canvasH;

  let drawW, drawH, offsetX, offsetY;
  if (imgRatio > canvasRatio) {
    drawH = canvasH;
    drawW = canvasH * imgRatio;
    offsetX = (canvasW - drawW) / 2;
    offsetY = 0;
  } else {
    drawW = canvasW;
    drawH = canvasW / imgRatio;
    offsetX = 0;
    offsetY = (canvasH - drawH) / 2;
  }

  // 캔버스 이미지 부드럽게 렌더링 설정
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, offsetX, offsetY, drawW, drawH);

  // 2. 하단 그라데이션 오버레이 (텍스트 가독성을 위해 어둡게 처리)
  const overlayGrad = ctx.createLinearGradient(0, 1100, 0, 1920);
  overlayGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  overlayGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.45)');
  overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 1100, 1080, 820);

  // 3. 좌측 하단 정보 렌더링 (X 시작점: 90px)
  const startX = 90;

  // 3-1. OOTD COMBAT POWER (작은 메타 정보)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'left';
  ctx.font = 'bold 30px Montserrat, sans-serif';
  ctx.fillText('OOTD COMBAT POWER', startX, 1420);

  // 3-2. 패션력 포인트 (메인 텍스트 - 아주 크게)
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px Montserrat, sans-serif';
  const scoreText = `${state.score.toLocaleString()} PTS`;
  ctx.fillText(scoreText, startX, 1520);

  // 3-3. 상황과 티어 (하트 아이콘 포함)
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px Lexend, sans-serif';
  const tpoAndTier = `♡ 상황: ${state.selectedTpo}  ·  티어: ${state.tier}`;
  ctx.fillText(tpoAndTier, startX, 1585);

  // 3-4. 한줄평 (wrapText로 여러 줄 대응)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '500 28px Lexend, sans-serif';
  const roast = roastWords || (dom.resultRoastText ? dom.resultRoastText.textContent : '');
  const lastY = wrapText(ctx, roast, startX, 1645, 900, 42);

  // 3-5. AI 생성 표시 문구 (실제 추천코디 적용 후 AI로 생성했을 때만 한줄평 바로 아래 노출)
  const isAiGenerated = !state.isBattleMode && state.improvedOotdImage;
  if (isAiGenerated) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';
    ctx.font = '500 24px Lexend, sans-serif';
    ctx.fillText('✨ AI로 생성한 콘텐츠', startX, lastY + 45);
  }

  // 4. 하단 중앙 브랜드 텍스트 (@team.letsgo_fit)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px Montserrat, sans-serif';
  ctx.fillText('@team.letsgo_fit', 540, 1850);
}

// 텍스트 여러 줄 정렬 도우미
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    let metrics = context.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
  return y;
}

// ========================================================
// ⚙️ 사운드 효과음 에뮬레이터 (Mock Web Audio API)
// ========================================================
function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'beep') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'select' || type === 'chip') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3); // C6
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'upgrade') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'scan_start') {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'retry') {
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    // 오디오 컨텍스트 차단 무시
  }
}

// 배틀 대결 링크 복사 기능 (클립보드 API)
function copyBattleLink() {
  playSound('select');
  const battleUrl = `${window.location.origin}${window.location.pathname}?score=${state.score}&tpo=${encodeURIComponent(state.selectedTpo)}`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(battleUrl)
      .then(() => {
        showToast("배틀 대결 링크가 복사되었습니다! 친구들에게 공유해보세요! 🔗");
        playSound('success');
      })
      .catch(() => {
        fallbackCopyTextToClipboard(battleUrl);
      });
  } else {
    fallbackCopyTextToClipboard(battleUrl);
  }
}

// 구형 브라우저 대응용 폴백 복사 로직
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast("배틀 대결 링크가 복사되었습니다! 🔗");
      playSound('success');
    } else {
      showToast("링크 복사에 실패했습니다. 주소를 직접 복사해주세요.");
    }
  } catch (err) {
    showToast("링크 복사에 실패했습니다.");
  }
  document.body.removeChild(textArea);
}

// 인스타그램 웹 연동
// 주의: instagram:// 커스텀 스킴은 앱인토스 웹뷰 네이티브 브릿지(Linking)에서
// 지원하지 않는 스킴이라 열 수 없다는 경고가 발생하고 좀처럼 닫히지 않는다.
// (앱인토스 SDK도 외부 앱 스킴을 여는 API를 제공하지 않음)
// 대신 파일 공유가 가능하면 네이티브 공유 시트를 띄운다 - 사용자가 시트에서 인스타그램을
// 선택하면 인스타그램 앱 자체의 스토리/게시물 작성 화면으로 사진과 함께 바로 이동한다.
// 공유가 불가능한 환경(데스크탑 등)에서만 인스타그램 웹으로 폴백한다.
// 무신사 앱이 설치되어 있으면 앱으로 열고, 없으면(또는 안드로이드가 아니면) 웹으로 이동한다.
function openMusinsaSearch(url) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) {
    remoteLog('openMusinsaSearch', { branch: 'non-android-web-open', url });
    window.open(url, '_blank');
    return;
  }

  // 안드로이드 표준 Intent URI: 무신사 앱(com.musinsa.store)이 설치되어 있으면
  // 앱으로 바로 이동하고, 없으면 S.browser_fallback_url로 지정한 웹 페이지로 이동한다.
  const withoutScheme = url.replace(/^https?:\/\//, '');
  const intentUrl = `intent://${withoutScheme}#Intent;scheme=https;package=com.musinsa.store;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  remoteLog('openMusinsaSearch', { branch: 'attempt-intent', intentUrl });

  // 앱인토스 웹뷰가 intent:// 를 지원하지 않을 경우를 대비해, 페이지가 계속 보이면
  // (= 앱으로 전환되지 않았으면) 직접 웹 URL로 폴백한다.
  const fallbackTimer = setTimeout(() => {
    remoteLog('openMusinsaSearch', { branch: 'fallback-timer-fired', documentHidden: document.hidden, url });
    window.open(url, '_blank');
  }, 2500);
  const cancelFallback = (reason) => {
    remoteLog('openMusinsaSearch', { branch: 'fallback-cancelled', reason });
    clearTimeout(fallbackTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
  const onVisibilityChange = () => {
    if (document.hidden) cancelFallback('visibilitychange-hidden');
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  try {
    window.location.href = intentUrl;
    remoteLog('openMusinsaSearch', { branch: 'intent-navigation-called-no-throw' });
  } catch (err) {
    remoteLog('openMusinsaSearch', { branch: 'intent-threw', message: err?.message });
    cancelFallback('intent-threw');
    window.open(url, '_blank');
  }
}

// 웹뷰 console.log는 wrangler 서버 로그로 전달되지 않아서, 서버로 직접 보내
// wrangler 콘솔에 남긴다 (개발/QA 디버깅 전용).
function remoteLog(tag, data) {
  try {
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, ts: new Date().toISOString(), ...data }),
    }).catch(() => {});
  } catch {
    // 무시 - 디버깅 전용 로그이므로 실패해도 앱 동작에 영향 없음
  }
}

// 공유 관련 기능 디버깅용 - Web Share/파일 공유 지원 여부를 콘솔/서버 로그에 남긴다.
function logShareCapability(tag) {
  const canShareFiles = !!(state.shareImageFile && navigator.canShare?.({ files: [state.shareImageFile] }));
  const info = {
    hasShareImageFile: !!state.shareImageFile,
    hasNavigatorShare: !!navigator.share,
    hasCanShare: !!navigator.canShare,
    canShareFiles,
  };
  console.log(`[${tag}]`, info);
  remoteLog(tag, info);
  return canShareFiles;
}

async function openInstagramApp() {
  playSound('select');
  const canShareFiles = logShareCapability('openInstagramApp');
  if (state.shareImageFile && navigator.share && canShareFiles) {
    try {
      await navigator.share({
        files: [state.shareImageFile],
        title: 'FITCHECK! OOTD',
        text: '공유 시트에서 인스타그램을 선택하면 바로 업로드할 수 있어요! 📸',
      });
      remoteLog('openInstagramApp', { branch: 'share-resolved' });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') {
        remoteLog('openInstagramApp', { branch: 'share-aborted-by-user' });
        return;
      }
      remoteLog('openInstagramApp', { branch: 'share-threw', name: err?.name, message: err?.message });
    }
  } else {
    remoteLog('openInstagramApp', { branch: 'no-file-share-support-web-fallback' });
  }
  window.open("https://www.instagram.com/", "_blank");
}

// 시스템 공유 API 호출 (Web Share API)
async function shareSystem() {
  playSound('select');
  if (!state.shareImageFile) {
    showToast("공유할 이미지 파일이 준비되지 않았습니다.");
    return;
  }

  try {
    await navigator.share({
      files: [state.shareImageFile],
      title: 'FITCHECK! OOTD',
      text: '내 OOTD 패션 점수를 확인해보세요! 📸',
    });
    showToast("공유가 완료되었습니다! ✨");
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error("System share failed", err);
      showToast("공유 중 오류가 발생했습니다.");
    }
  }
}

// 선택적 이미지 다운로드 실행
async function downloadShareImage() {
  remoteLog('downloadShareImage', { branch: 'called', hasShareImageDataUrl: !!state.shareImageDataUrl });
  if (!state.shareImageDataUrl) {
    showToast("다운로드할 이미지가 없습니다.");
    return;
  }

  // 앱인토스 웹뷰 등에서는 <a download> 클릭이 씹혀서 갤러리에 저장되지 않는 경우가 많아,
  // 파일 공유가 가능하면 네이티브 공유 시트(사진 앱으로 저장 옵션 포함)를 우선 사용한다.
  const canShareFiles = logShareCapability('downloadShareImage');
  if (state.shareImageFile && navigator.share && canShareFiles) {
    try {
      await navigator.share({
        files: [state.shareImageFile],
        title: 'FITCHECK! OOTD',
        text: '내 OOTD 패션 점수 결과예요! 사진 앱에 저장해보세요. 📸',
      });
      remoteLog('downloadShareImage', { branch: 'share-resolved' });
      showToast("공유 시트에서 '사진에 저장'을 선택해 보관해 주세요! 💾");
      playSound('download');
      return;
    } catch (err) {
      if (err?.name === 'AbortError') {
        remoteLog('downloadShareImage', { branch: 'share-aborted-by-user' });
        return;
      }
      remoteLog('downloadShareImage', { branch: 'share-threw', name: err?.name, message: err?.message });
    }
  } else {
    remoteLog('downloadShareImage', { branch: 'no-file-share-support-fallback-to-a-download' });
  }

  try {
    const downloadLink = document.createElement('a');
    downloadLink.download = `fitcheck_ootd_${state.score}.png`;
    downloadLink.href = state.shareImageDataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    remoteLog('downloadShareImage', { branch: 'a-download-click-dispatched-no-throw' });

    showToast("이미지가 기기에 저장되었습니다! 💾");
    playSound('download');
  } catch (err) {
    remoteLog('downloadShareImage', { branch: 'a-download-threw', message: err?.message });
    showToast("이미지 다운로드에 실패했습니다.");
  }
}

// 실행
document.addEventListener('DOMContentLoaded', init);

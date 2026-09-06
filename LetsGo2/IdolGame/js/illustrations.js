// 캐릭터 일러스트 (커리어 단계별 정적 SVG) — 기획서 와이어프레임과 동일한 그림을 재사용
const CHARACTER_ILLUSTRATIONS = {
  trainee: `
    <svg width="100%" height="100%" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="tBg" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dde3ea"/>
        </radialGradient>
        <linearGradient id="tHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6b503c"/><stop offset="100%" stop-color="#4a3728"/>
        </linearGradient>
        <linearGradient id="tOutfit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b7c0cb"/><stop offset="100%" stop-color="#8b96a3"/>
        </linearGradient>
        <linearGradient id="tSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe3c7"/><stop offset="100%" stop-color="#f2c9a0"/>
        </linearGradient>
      </defs>
      <rect width="160" height="200" fill="#eef1f6"/>
      <ellipse cx="80" cy="90" rx="95" ry="105" fill="url(#tBg)"/>
      <path d="M40 70 C34 110 36 150 44 190 L58 190 C52 150 50 110 54 78 Z" fill="url(#tHair)"/>
      <path d="M120 70 C126 110 124 150 116 190 L102 190 C108 150 110 110 106 78 Z" fill="url(#tHair)"/>
      <path d="M24 200 C24 148 48 124 80 124 C112 124 136 148 136 200 Z" fill="url(#tOutfit)"/>
      <path d="M62 132 L98 132 L92 148 L68 148 Z" fill="#ffffff" opacity="0.5"/>
      <rect x="68" y="98" width="24" height="30" fill="url(#tSkin)"/>
      <path d="M68 118 Q80 128 92 118" stroke="#e0ab7f" stroke-width="1.5" fill="none" opacity="0.6"/>
      <circle cx="45" cy="80" r="6" fill="url(#tSkin)"/>
      <circle cx="115" cy="80" r="6" fill="url(#tSkin)"/>
      <circle cx="80" cy="76" r="36" fill="url(#tSkin)"/>
      <path d="M44 64 C42 34 60 18 80 18 C100 18 118 34 116 64 C112 44 100 34 80 34 C60 34 48 44 44 64 Z" fill="url(#tHair)"/>
      <path d="M50 40 C54 50 54 60 50 66" stroke="#7a5c46" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <path d="M110 40 C106 50 106 60 110 66" stroke="#7a5c46" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <rect x="46" y="36" width="68" height="8" rx="4" fill="#7d8a99"/>
      <circle cx="80" cy="40" r="4" fill="#5b6ee1"/>
      <path d="M60 70 Q68 65 76 69" stroke="#4a3728" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M84 69 Q92 65 100 70" stroke="#4a3728" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="68" cy="78" rx="5.5" ry="7" fill="#3a2c22"/>
      <ellipse cx="92" cy="78" rx="5.5" ry="7" fill="#3a2c22"/>
      <circle cx="70" cy="75" r="1.6" fill="#ffffff"/>
      <circle cx="94" cy="75" r="1.6" fill="#ffffff"/>
      <ellipse cx="62" cy="90" rx="7" ry="4" fill="#f4a9a0" opacity="0.35"/>
      <ellipse cx="98" cy="90" rx="7" ry="4" fill="#f4a9a0" opacity="0.35"/>
      <path d="M72 95 Q80 100 88 95" stroke="#b5715a" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,

  debut: `
    <svg width="100%" height="100%" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dBg" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e7ddfa"/>
        </radialGradient>
        <linearGradient id="dHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4a382c"/><stop offset="100%" stop-color="#241a14"/>
        </linearGradient>
        <linearGradient id="dOutfit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9b7cf5"/><stop offset="100%" stop-color="#6a4fd1"/>
        </linearGradient>
        <linearGradient id="dSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe3c7"/><stop offset="100%" stop-color="#f2c9a0"/>
        </linearGradient>
      </defs>
      <rect width="160" height="200" fill="#f5eefc"/>
      <ellipse cx="80" cy="90" rx="95" ry="105" fill="url(#dBg)"/>
      <path d="M38 66 C30 108 32 150 42 190 L58 190 C50 150 48 108 54 74 Z" fill="url(#dHair)"/>
      <path d="M122 66 C130 108 128 150 118 190 L102 190 C110 150 112 108 106 74 Z" fill="url(#dHair)"/>
      <path d="M24 200 C24 148 48 124 80 124 C112 124 136 148 136 200 Z" fill="url(#dOutfit)"/>
      <path d="M62 132 L98 132 L92 148 L68 148 Z" fill="#ffffff" opacity="0.35"/>
      <path d="M34 158 L38 152 L42 158 L38 164 Z" fill="#ffffff" opacity="0.8"/>
      <path d="M118 168 L121.5 163 L125 168 L121.5 173 Z" fill="#ffffff" opacity="0.8"/>
      <rect x="68" y="98" width="24" height="30" fill="url(#dSkin)"/>
      <path d="M68 118 Q80 128 92 118" stroke="#e0ab7f" stroke-width="1.5" fill="none" opacity="0.6"/>
      <circle cx="45" cy="80" r="6" fill="url(#dSkin)"/>
      <circle cx="115" cy="80" r="6" fill="url(#dSkin)"/>
      <circle cx="45" cy="86" r="2" fill="#d4af37"/>
      <circle cx="115" cy="86" r="2" fill="#d4af37"/>
      <circle cx="80" cy="76" r="36" fill="url(#dSkin)"/>
      <path d="M42 62 C38 30 58 16 80 16 C102 16 122 30 118 62 C114 40 100 30 80 30 C60 30 46 40 42 62 Z" fill="url(#dHair)"/>
      <ellipse cx="106" cy="34" rx="7" ry="5" fill="#c23b6b"/>
      <ellipse cx="106" cy="34" rx="2.4" ry="2.4" fill="#f4a9c9"/>
      <path d="M50 40 C54 50 54 60 50 66" stroke="#5c4636" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <path d="M110 40 C106 50 106 60 110 66" stroke="#5c4636" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <path d="M60 68 Q68 63 76 67" stroke="#241a14" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M84 67 Q92 63 100 68" stroke="#241a14" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="68" cy="77" rx="5.5" ry="7" fill="#3a2c22"/>
      <ellipse cx="92" cy="77" rx="5.5" ry="7" fill="#3a2c22"/>
      <circle cx="70" cy="74" r="1.6" fill="#ffffff"/>
      <circle cx="94" cy="74" r="1.6" fill="#ffffff"/>
      <ellipse cx="62" cy="89" rx="7" ry="4" fill="#f4a9a0" opacity="0.35"/>
      <ellipse cx="98" cy="89" rx="7" ry="4" fill="#f4a9a0" opacity="0.35"/>
      <path d="M72 94 Q80 99 88 94" stroke="#b5715a" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,

  peak: `
    <svg width="100%" height="100%" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pBg" cx="50%" cy="28%" r="78%">
          <stop offset="0%" stop-color="#fff8ea"/><stop offset="100%" stop-color="#f3d9a8"/>
        </radialGradient>
        <linearGradient id="pHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a2b22"/><stop offset="100%" stop-color="#160f0b"/>
        </linearGradient>
        <linearGradient id="pOutfit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d1355a"/><stop offset="100%" stop-color="#7d1729"/>
        </linearGradient>
        <linearGradient id="pSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe3c7"/><stop offset="100%" stop-color="#f2c9a0"/>
        </linearGradient>
      </defs>
      <rect width="160" height="200" fill="#fff7e6"/>
      <ellipse cx="80" cy="90" rx="95" ry="105" fill="url(#pBg)"/>
      <path d="M36 62 C24 106 26 150 40 192 L58 192 C48 150 46 106 52 70 C60 78 58 60 52 52 Z" fill="url(#pHair)"/>
      <path d="M124 62 C136 106 134 150 120 192 L102 192 C112 150 114 106 108 70 C100 78 102 60 108 52 Z" fill="url(#pHair)"/>
      <path d="M22 200 C22 146 46 122 80 122 C114 122 138 146 138 200 Z" fill="url(#pOutfit)"/>
      <path d="M80 122 C68 128 62 142 65 158 L95 158 C98 142 92 128 80 122 Z" fill="#5e1220"/>
      <path d="M65 158 Q80 166 95 158" stroke="#d4af37" stroke-width="2" fill="none"/>
      <rect x="68" y="98" width="24" height="28" fill="url(#pSkin)"/>
      <path d="M68 116 Q80 126 92 116" stroke="#e0ab7f" stroke-width="1.5" fill="none" opacity="0.6"/>
      <path d="M70 128 Q80 134 90 128" stroke="#d4af37" stroke-width="2" fill="none"/>
      <circle cx="80" cy="134" r="3" fill="#d4af37"/>
      <circle cx="45" cy="80" r="6" fill="url(#pSkin)"/>
      <circle cx="115" cy="80" r="6" fill="url(#pSkin)"/>
      <ellipse cx="45" cy="90" rx="2.2" ry="4" fill="#d4af37"/>
      <ellipse cx="115" cy="90" rx="2.2" ry="4" fill="#d4af37"/>
      <circle cx="80" cy="76" r="36" fill="url(#pSkin)"/>
      <path d="M38 58 C30 26 52 14 80 14 C108 14 130 26 122 58 C118 34 102 24 80 24 C58 24 42 34 38 58 Z" fill="url(#pHair)"/>
      <path d="M34 30 C30 40 30 48 34 54" stroke="#6b4c3a" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.55"/>
      <path d="M126 30 C130 40 130 48 126 54" stroke="#6b4c3a" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.55"/>
      <path d="M56 24 Q80 6 104 24" stroke="#d4af37" stroke-width="3" fill="none"/>
      <circle cx="80" cy="12" r="4" fill="#d4af37"/>
      <circle cx="64" cy="19" r="2.4" fill="#d4af37"/>
      <circle cx="96" cy="19" r="2.4" fill="#d4af37"/>
      <path d="M60 68 Q68 63 76 67" stroke="#160f0b" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M84 67 Q92 63 100 68" stroke="#160f0b" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="68" cy="77" rx="5.5" ry="7.5" fill="#2c1a12"/>
      <ellipse cx="92" cy="77" rx="5.5" ry="7.5" fill="#2c1a12"/>
      <circle cx="70" cy="73" r="1.7" fill="#ffffff"/>
      <circle cx="94" cy="73" r="1.7" fill="#ffffff"/>
      <path d="M73 71 L78 68" stroke="#160f0b" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M87 71 L82 68" stroke="#160f0b" stroke-width="1.4" stroke-linecap="round"/>
      <ellipse cx="62" cy="89" rx="7" ry="4" fill="#e0577a" opacity="0.4"/>
      <ellipse cx="98" cy="89" rx="7" ry="4" fill="#e0577a" opacity="0.4"/>
      <path d="M71 94 Q80 100 89 94" stroke="#a8354f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    </svg>`
};

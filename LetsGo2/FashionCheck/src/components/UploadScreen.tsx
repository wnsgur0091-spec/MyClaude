import { useRef, useState } from 'react'
import { Situation, SITUATION_LABELS } from '../types/fashion'

interface Props {
  onAnalyze: (imageBase64: string, situation?: Situation) => void
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

// Fix 3: 모바일 대응 강화된 이미지 리사이즈
const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return reject(new Error('이미지 데이터 없음'))

      const img = new Image()
      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.onload = () => {
        try {
          const MAX = 1024
          let { width, height } = img
          const ratio = Math.min(MAX / width, MAX / height, 1)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)

          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas 미지원'))
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        } catch (err) {
          reject(err)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })

export default function UploadScreen({ onAnalyze }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [situation, setSituation] = useState<Situation | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fix 3: 에러 핸들링 추가
  const handleFile = async (file: File) => {
    setUploadError(null)
    // type이 없어도 허용 (일부 모바일 환경에서 type이 비어 있을 수 있음)
    if (file.type && !file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드할 수 있어요')
      return
    }
    try {
      const base64 = await resizeImage(file)
      setPreview(base64)
      setImageData(base64)
    } catch (err) {
      setUploadError(`업로드 실패: ${String(err)}`)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    // Fix 3: 같은 파일 재선택 가능하도록 value 초기화
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 10px',
          background: 'linear-gradient(135deg, #1D4ED8, #60A5FA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, boxShadow: '0 4px 20px rgba(61,126,255,0.35)',
        }}>👗</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>FashionCheck</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
          오늘의 패션력을 패션왕이 판단해줄게요
        </p>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          position: 'relative', width: '100%', aspectRatio: '3/4',
          borderRadius: 20, overflow: 'hidden',
          background: preview ? 'transparent' : 'var(--surface)',
          border: preview ? 'none' : '2px dashed rgba(61,126,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: preview ? 'default' : 'pointer', flexShrink: 0,
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={(e) => { e.stopPropagation(); setPreview(null); setImageData(null); setUploadError(null) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                borderRadius: '50%', width: 32, height: 32,
                fontSize: 16, backdropFilter: 'blur(4px)',
              }}
            >✕</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '0 20px' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 50, margin: '0 auto 14px',
              background: 'rgba(61,126,255,0.12)', border: '1.5px solid rgba(61,126,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>📸</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>OOTD 사진 업로드</p>
            <p style={{ fontSize: 12, marginTop: 5, color: 'var(--text-dim)' }}>
              {isMobile ? '사진첩 또는 카메라로 사진을 선택하세요' : '탭하거나 드래그하세요'}
            </p>
          </div>
        )}

        {/* Fix 6: capture 제거 → 모바일에서 사진첩/카메라 선택 가능 */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>

      {/* Fix 3: 업로드 에러 표시 */}
      {uploadError && (
        <p style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginTop: 8 }}>
          ⚠️ {uploadError}
        </p>
      )}

      {/* Situation Selector */}
      <div style={{ marginTop: 18 }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          상황 선택 <span style={{ opacity: 0.5 }}>(선택사항)</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(Object.entries(SITUATION_LABELS) as [Situation, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSituation(situation === key ? null : key)}
              style={{
                padding: '7px 13px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                background: situation === key ? 'var(--accent)' : 'var(--surface2)',
                color: situation === key ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 28 }} />

      <button
        disabled={!imageData}
        onClick={() => imageData && onAnalyze(imageData, situation ?? undefined)}
        style={{
          width: '100%', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 700,
          background: imageData ? 'linear-gradient(135deg, #1D4ED8, #3D7EFF, #60A5FA)' : 'var(--surface2)',
          color: imageData ? '#fff' : 'var(--text-dim)',
          transition: 'all 0.2s', letterSpacing: '-0.3px',
          boxShadow: imageData ? '0 4px 20px rgba(61,126,255,0.4)' : 'none',
        }}
      >
        패션력 측정하기 ✦
      </button>
    </div>
  )
}

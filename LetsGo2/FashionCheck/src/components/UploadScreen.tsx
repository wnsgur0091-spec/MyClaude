import { useRef, useState } from 'react'
import { Situation, SITUATION_LABELS } from '../types/fashion'

interface Props {
  onAnalyze: (imageBase64: string, situation?: Situation) => void
}

const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target!.result as string
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > height) { if (width > MAX) { height = (height * MAX) / width; width = MAX } }
        else                 { if (height > MAX) { width = (width * MAX) / height; height = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
    }
    reader.readAsDataURL(file)
  })

export default function UploadScreen({ onAnalyze }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [situation, setSituation] = useState<Situation | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const base64 = await resizeImage(file)
    setPreview(base64)
    setImageData(base64)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>👗</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>FashionCheck</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>오늘의 패션력을 AI가 판단합니다</p>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          borderRadius: 20,
          overflow: 'hidden',
          background: preview ? 'transparent' : 'var(--surface)',
          border: preview ? 'none' : '2px dashed var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: preview ? 'default' : 'pointer',
          flexShrink: 0,
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => { setPreview(null); setImageData(null) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                borderRadius: '50%', width: 32, height: 32,
                fontSize: 16, backdropFilter: 'blur(4px)',
              }}
            >✕</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>OOTD 사진 업로드</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>탭하거나 드래그하세요</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* Situation Selector */}
      <div style={{ marginTop: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          상황 선택 <span style={{ opacity: 0.5 }}>(선택사항)</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(Object.entries(SITUATION_LABELS) as [Situation, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSituation(situation === key ? null : key)}
              style={{
                padding: '7px 13px',
                borderRadius: 50,
                fontSize: 13,
                fontWeight: 500,
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

      {/* CTA */}
      <button
        disabled={!imageData}
        onClick={() => imageData && onAnalyze(imageData, situation ?? undefined)}
        style={{
          marginTop: 'auto',
          paddingTop: 20,
          width: '100%',
          padding: '16px',
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 700,
          background: imageData ? 'var(--accent)' : 'var(--surface2)',
          color: imageData ? '#fff' : 'var(--text-dim)',
          transition: 'all 0.2s',
          letterSpacing: '-0.3px',
        }}
      >
        패션력 측정하기 ⚡
      </button>
    </div>
  )
}

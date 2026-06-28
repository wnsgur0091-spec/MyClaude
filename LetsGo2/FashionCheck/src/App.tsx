import { useState } from 'react'
import { AppState, FashionResult, Situation } from './types/fashion'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultScreen from './components/ResultScreen'

export default function App() {
  const [state, setState] = useState<AppState>('idle')
  const [result, setResult] = useState<FashionResult | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (imageBase64: string, situation?: Situation) => {
    setState('analyzing')
    setImageUrl(imageBase64)
    setError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, situation }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data: FashionResult = await res.json()
      setResult(data)
      setState('result')
    } catch (err) {
      setError(String(err))
      setState('error')
    }
  }

  const handleRetry = () => {
    setState('idle')
    setResult(null)
    setImageUrl(null)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', overflowY: 'auto' }}>
      {state === 'idle' && <UploadScreen onAnalyze={handleAnalyze} />}
      {state === 'analyzing' && <LoadingScreen />}
      {state === 'result' && result && imageUrl && (
        <ResultScreen result={result} imageUrl={imageUrl} onRetry={handleRetry} />
      )}
      {state === 'error' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <div style={{ fontSize: 48 }}>😵</div>
          <p style={{ fontSize: 16, fontWeight: 700 }}>분석 실패</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>{error}</p>
          <button
            onClick={handleRetry}
            style={{ padding: '12px 24px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700 }}
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}

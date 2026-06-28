import { useEffect } from 'react'
import { Gender, Improvement, getShopLinks } from '../types/fashion'

interface Props {
  item: Improvement | null
  gender?: Gender
  onClose: () => void
}

export default function ImprovementModal({ item, gender, onClose }: Props) {
  useEffect(() => {
    if (item) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [item])

  if (!item) return null

  // Fix 1: 표시 레이블에도 성별 워딩 포함
  const genderedLabel =
    gender === 'female' && !item.searchQuery.includes('여성')
      ? `${item.searchQuery} 여성`
      : gender === 'male' && !item.searchQuery.includes('남성')
      ? `${item.searchQuery} 남성`
      : item.searchQuery

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430, margin: '0 auto',
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          borderTop: '3px solid #000',
          borderLeft: '3px solid #000',
          borderRight: '3px solid #000',
          padding: '20px 20px 36px',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 20px' }} />

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{
            fontSize: 28,
            filter: 'drop-shadow(2px 2px 0 #000)',
          }}>😈</span>
          <div>
            <p style={{
              fontSize: 16, fontWeight: 800,
              WebkitTextStroke: '0.3px #000',
            }}>{item.item} 교체 추천</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{item.comment}</p>
          </div>
        </div>

        {/* Fix 1: 성별 포함된 검색어 표시 */}
        <p style={{
          fontSize: 13, color: 'var(--text-dim)', marginBottom: 14,
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--surface2)',
          border: '1.5px solid var(--border)',
        }}>
          <strong style={{ color: 'var(--text)' }}>"{genderedLabel}"</strong> 로 검색한 결과예요
        </p>

        {/* 쇼핑 링크 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {getShopLinks(item.searchQuery, gender).map((shop) => (
            <a
              key={shop.name}
              href={shop.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cartoon-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--surface2)', borderRadius: 12,
                textDecoration: 'none', color: 'var(--text)',
                fontSize: 15, fontWeight: 700,
              }}
            >
              <span>{shop.name}</span>
              <span style={{ fontSize: 18, fontWeight: 900 }}>→</span>
            </a>
          ))}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}

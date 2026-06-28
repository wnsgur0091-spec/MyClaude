import { useEffect } from 'react'
import { Improvement, getShopLinks } from '../types/fashion'

interface Props {
  item: Improvement | null
  onClose: () => void
}

export default function ImprovementModal({ item, onClose }: Props) {
  useEffect(() => {
    if (item) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [item])

  if (!item) return null

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
          background: 'var(--surface)', borderRadius: '20px 20px 0 0',
          padding: '20px 20px 36px',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>😈</span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700 }}>{item.item} 교체 추천</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{item.comment}</p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
          <strong style={{ color: 'var(--text)' }}>"{item.searchQuery}"</strong> 로 검색한 결과예요
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {getShopLinks(item.searchQuery).map((shop) => (
            <a
              key={shop.name}
              href={shop.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--surface2)', borderRadius: 12,
                textDecoration: 'none', color: 'var(--text)',
                fontSize: 15, fontWeight: 600,
              }}
            >
              <span>{shop.name}</span>
              <span style={{ fontSize: 18 }}>→</span>
            </a>
          ))}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}

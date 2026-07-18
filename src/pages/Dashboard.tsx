import { useEffect, useState } from 'react'
import { api, type MarketStats } from '../api.ts'
import { headerBar, scrollArea, card } from '../ui.tsx'
import { PriceTrendChart } from '../components/PriceTrendChart.tsx'
import { ProductionComparisonChart } from '../components/ProductionComparisonChart.tsx'

export function DashboardPage() {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [error, setError] = useState('')
  const [crop, setCrop] = useState<string>('')

  useEffect(() => {
    api.marketStats().then((s) => {
      setStats(s)
      if (s.priceTrend.length) setCrop(s.priceTrend[0].crop)
    }).catch((e) => setError((e as Error).message))
  }, [])

  const series = stats?.priceTrend.find((p) => p.crop === crop) ?? stats?.priceTrend[0]

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'mfade .25s ease-out' }}>
      <div style={headerBar}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>통계 대시보드</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>공식 파일 기반 가격·재배면적·생산량 통계입니다</div>
      </div>
      <div style={scrollArea}>
        {error && <div style={{ ...card, color: '#B91C1C', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {!stats ? (
          <div style={{ ...card, color: '#9CA3AF', fontSize: 13 }}>불러오는 중…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
              {stats.priceTrend.map((p) => {
                const active = p.crop === crop
                return (
                  <button key={p.crop} onClick={() => setCrop(p.crop)} style={{ border: `1px solid ${active ? '#15803D' : '#E5E7EB'}`, background: active ? '#15803D' : '#fff', color: active ? '#fff' : '#374151', cursor: 'pointer', padding: '5px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600 }}>{p.crop}</button>
                )
              })}
            </div>
            {series && <div style={card}><PriceTrendChart series={series} /></div>}
            <div style={{ ...card, marginTop: 14 }}>
              <ProductionComparisonChart production={stats.production} />
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 14, lineHeight: 1.5 }}>
              {stats.source}<br />
              갱신: {new Date(stats.generatedAt).toLocaleString('ko-KR')} · 모드: {stats.mode}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

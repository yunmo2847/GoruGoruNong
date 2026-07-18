import { useEffect, useState } from 'react'
import { api, type Recommendation, type Factors } from '../api.ts'
import { card, PercentBar } from '../ui.tsx'

const FACTOR_LABELS: Record<keyof Factors, string> = {
  profitability: '수익성',
  climate: '기후적합도',
  headroom: '수급여유도',
  ease: '전환용이성',
}
const FACTOR_COLORS: Record<keyof Factors, string> = {
  profitability: '#15803D',
  climate: '#0EA5E9',
  headroom: '#8B5CF6',
  ease: '#F59E0B',
}

export function RecommendationCard({ region, crop }: { region: string; crop: string }) {
  const [data, setData] = useState<Recommendation | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setError('')
    api
      .recommendation(region, crop)
      .then(setData)
      .catch((e) => setError((e as Error).message))
  }, [region, crop])

  if (error) return <div style={{ ...card, marginTop: 14, color: '#B91C1C', fontSize: 13 }}>추천을 불러오지 못했습니다: {error}</div>
  if (!data) return <div style={{ ...card, marginTop: 14, color: '#9CA3AF', fontSize: 13 }}>대체작물 추천 계산 중…</div>

  const factorKeys = Object.keys(FACTOR_LABELS) as (keyof Factors)[]

  return (
    <div style={{ ...card, marginTop: 14, animation: 'mfade .2s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>대체작물 추천</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{region} · {crop} 대신</span>
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
        가중치 수익성 {Math.round(data.weights.profitability * 100)} · 기후 {Math.round(data.weights.climate * 100)} · 수급여유 {Math.round(data.weights.headroom * 100)} · 전환 {Math.round(data.weights.ease * 100)}
        {data.providerKind === 'real' ? ' · 실적합도 어댑터(폴백)' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.candidates.map((cand, i) => {
          const open = expanded === cand.crop
          return (
            <div key={cand.crop} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 12px' }}>
              <button
                onClick={() => setExpanded(open ? null : cand.crop)}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
              >
                <span style={{ width: 20, height: 20, borderRadius: 99, background: i === 0 ? '#15803D' : '#E5E7EB', color: i === 0 ? '#fff' : '#6B7280', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cand.crop}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', flex: 'none' }}>{cand.group}</span>
                <span style={{ marginLeft: 'auto', flex: 'none', fontSize: 15, fontWeight: 800, color: '#15803D', fontVariantNumeric: 'tabular-nums' }}>{cand.score.toFixed(1)}</span>
                <span style={{ color: '#C9CFCC', fontSize: 12, flex: 'none' }}>{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F2F1' }}>
                  {factorKeys.map((k) => (
                    <PercentBar key={k} label={FACTOR_LABELS[k]} value={cand.factors[k]} color={FACTOR_COLORS[k]} labelWidth={58} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

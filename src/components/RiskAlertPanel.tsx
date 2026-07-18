import { useState } from 'react'
import type { HeatmapRow } from '../api.ts'
import { card, TierBadge, fmtPyeong, fmtPct } from '../ui.tsx'
import { TIER_COLORS } from '../ui.tsx'
import { RecommendationCard } from './RecommendationCard.tsx'

export function RiskAlertPanel({ row }: { row: HeatmapRow }) {
  const [showReco, setShowReco] = useState(false)
  const c = TIER_COLORS[row.tier]
  const dirWord = row.over ? '과잉' : '부족'
  const advice =
    row.tier === '정상'
      ? '평년 범위 내로 조치가 필요하지 않습니다.'
      : row.over
        ? '공급 과잉 — 가격 하락 위험. 작목 전환 검토를 권장합니다.'
        : '공급 부족 — 가격 급등 위험. 확대 재배 여지를 검토하세요.'

  return (
    <>
      <div style={{ ...card, marginTop: 14, animation: 'mfade .2s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <TierBadge tier={row.tier} />
          <span style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>{row.region} · {row.crop}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>{row.province}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151' }}>
          등록면적 <b>{fmtPyeong(row.area)}</b>는 평년값 <b>{fmtPyeong(row.baselineHa)}</b> 대비{' '}
          <b style={{ color: c.border }}>{fmtPct(row.deviationPct)} {dirWord}</b>입니다.
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{advice}</div>
        <button
          onClick={() => setShowReco((s) => !s)}
          style={{ marginTop: 14, width: '100%', border: 'none', background: '#15803D', color: '#fff', cursor: 'pointer', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 700 }}
        >
          {showReco ? '추천 닫기' : '대체작물 추천 보기 →'}
        </button>
      </div>
      {showReco && <RecommendationCard region={row.region} crop={row.crop} />}
    </>
  )
}

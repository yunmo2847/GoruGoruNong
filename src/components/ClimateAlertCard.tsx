import { useEffect, useState } from 'react'
import { api, type ClimateAlert } from '../api.ts'
import { card, PercentBar } from '../ui.tsx'
import { RecommendationCard } from './RecommendationCard.tsx'

const TIER_STYLE: Record<ClimateAlert['tier'], { bg: string; text: string; border: string }> = {
  정상: { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' },
  주의: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  경보: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
}

export function ClimateAlertCard({ region, crop }: { region: string; crop: string }) {
  const [data, setData] = useState<ClimateAlert | null>(null)
  const [error, setError] = useState('')
  const [showReco, setShowReco] = useState(false)

  useEffect(() => {
    setData(null)
    setError('')
    setShowReco(false)
    api
      .climateAlert(region, crop)
      .then((d) => {
        setData(d)
        if (d.recommendTrigger) setShowReco(true) // 병충해發 경보는 대체작물 추천을 자동으로 펼쳐 보여줌
      })
      .catch((e) => setError((e as Error).message))
  }, [region, crop])

  if (error) return <div style={{ ...card, marginTop: 14, color: '#B91C1C', fontSize: 13 }}>기후·병충해 정보를 불러오지 못했습니다: {error}</div>
  if (!data) return <div style={{ ...card, marginTop: 14, color: '#9CA3AF', fontSize: 13 }}>기후·병충해 위험도 계산 중…</div>

  const t = TIER_STYLE[data.tier]

  return (
    <>
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ padding: '4px 12px', borderRadius: 99, background: t.bg, color: t.text, fontSize: 13, fontWeight: 700 }}>{data.tier}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>기후·병충해 위험도</span>
          <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800, color: t.border, fontVariantNumeric: 'tabular-nums' }}>{data.totalScore.toFixed(1)}</span>
        </div>

        {data.immediateAlert && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
            ⚠ 즉시알림 — 종합 위험도가 경보 수준입니다.
          </div>
        )}
        {data.controlGuidance && (
          <div style={{ background: '#FEF3C7', color: '#92400E', padding: '8px 12px', borderRadius: 10, fontSize: 12.5, marginBottom: 8 }}>
            방제안내 — 병해충 위험이 높습니다. 예찰 정보를 참고해 방제 시기를 앞당기세요.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <PercentBar label="기상" value={data.weatherScore} color="#0EA5E9" />
          <PercentBar label="병충해" value={data.pestScore} color="#DC2626" />
          <PercentBar label="장기기후" value={data.longtermScore} color="#7C3AED" />
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, lineHeight: 1.5 }}>
          생육단계: {data.growthStage}<br />
          {data.snapshot.source}
          {data.snapshot.generatedAt && <> · 갱신 {new Date(data.snapshot.generatedAt).toLocaleString('ko-KR')}</>}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F2F1' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 5 }}>⚠ 주의점</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.precautions.map((p, i) => (
              <li key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{p}</li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D', marginBottom: 5 }}>✓ 권장사항</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.recommendations.map((r, i) => (
              <li key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {data.recommendTrigger && !showReco && (
        <button
          onClick={() => setShowReco(true)}
          style={{ marginTop: 10, width: '100%', border: 'none', background: '#B91C1C', color: '#fff', cursor: 'pointer', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 700 }}
        >
          병충해 위험 — 대체작물 추천 보기 →
        </button>
      )}
      {showReco && <RecommendationCard region={region} crop={crop} />}
    </>
  )
}

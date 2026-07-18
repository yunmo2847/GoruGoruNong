import { useEffect, useMemo, useState } from 'react'
import { api, type HeatmapRow } from '../api.ts'
import { headerBar, scrollArea, card, TIER_COLORS } from '../ui.tsx'
import { HeatmapMap } from '../components/HeatmapMap.tsx'
import { RiskAlertPanel } from '../components/RiskAlertPanel.tsx'
import { ClimateAlertCard } from '../components/ClimateAlertCard.tsx'
import { ErrorBoundary } from '../components/ErrorBoundary.tsx'
import { fallbackHeatmapRows } from '../lib/fallbackHeatmap.ts'

export function MapPage() {
  const [rows, setRows] = useState<HeatmapRow[]>([])
  const [crop, setCrop] = useState<string>('')
  const [selKey, setSelKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    api.heatmap().then((r) => {
      const nextRows = r.rows.length ? r.rows : fallbackHeatmapRows()
      setUsingFallback(r.rows.length === 0)
      setRows(nextRows)
      if (nextRows.length) setCrop((c) => c || (nextRows.some((row) => row.crop === '배추') ? '배추' : nextRows[0].crop))
    }).catch((e) => {
      const nextRows = fallbackHeatmapRows()
      setUsingFallback(true)
      setRows(nextRows)
      if (nextRows.length) setCrop((c) => c || (nextRows.some((row) => row.crop === '배추') ? '배추' : nextRows[0].crop))
      setError(`API 연결 실패: ${(e as Error).message}`)
    })
  }, [])

  const crops = useMemo(() => [...new Set(rows.map((r) => r.crop))].sort(), [rows])
  const cropRows = useMemo(() => rows.filter((r) => r.crop === crop), [rows, crop])
  const selected = cropRows.find((r) => `${r.region}|${r.crop}` === selKey) || null

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'mfade .25s ease-out' }}>
      <div style={headerBar}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>전국 수급 지도</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>작물을 선택하면 시군구 편차가 색으로 표시됩니다</div>
      </div>
      <div style={scrollArea}>
        {error && <div style={{ ...card, color: '#B91C1C', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {usingFallback && (
          <div style={{ ...card, padding: '10px 13px', color: '#6B7280', fontSize: 11.5, marginBottom: 12 }}>
            서버 등록 데이터가 비어 있어 최신 기준값 기반 데모 분포를 표시합니다.
          </div>
        )}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {crops.map((c) => {
            const active = c === crop
            return (
              <button
                key={c}
                onClick={() => { setCrop(c); setSelKey(null) }}
                style={{ border: `1px solid ${active ? '#15803D' : '#E5E7EB'}`, background: active ? '#15803D' : '#fff', color: active ? '#fff' : '#374151', cursor: 'pointer', padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {c}
              </button>
            )
          })}
        </div>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{crop || '—'} · 전국 분포</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>등록 {cropRows.length}곳 · 원 크기=편차</span>
          </div>
          <div style={{ height: 380, borderRadius: 14, overflow: 'hidden', background: '#0b1a10', border: '1px solid #E5E7EB' }}>
            <HeatmapMap rows={cropRows} selectedKey={selKey} onSelect={(r) => setSelKey(`${r.region}|${r.crop}`)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F2F1', fontSize: 11, color: '#6B7280' }}>
            {(['정상', '관심', '주의', '경계'] as const).map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: TIER_COLORS[t].fill }} />{t}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>▲과잉 · ▼부족</span>
          </div>
        </div>
        {selected ? (
          <>
            <ErrorBoundary key={`risk|${selKey}`} label="수급 경보를 표시하는 중 문제가 발생했습니다.">
              <RiskAlertPanel row={selected} />
            </ErrorBoundary>
            <ErrorBoundary key={`climate|${selKey}`} label="기후·병충해 정보를 표시하는 중 문제가 발생했습니다.">
              <ClimateAlertCard region={selected.region} crop={selected.crop} />
            </ErrorBoundary>
          </>
        ) : (
          <div style={{ marginTop: 14, background: '#fff', border: '1px dashed #D1D5DB', borderRadius: 18, padding: 24, textAlign: 'center', color: '#6B7280', fontSize: 13, lineHeight: 1.6 }}>
            지역 타일을 누르면<br />수급 경보와 대체작물 추천이 열립니다.
          </div>
        )}
      </div>
    </div>
  )
}

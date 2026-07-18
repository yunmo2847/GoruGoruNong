// 전국 수급 지도 — 시군구 좌표 기반 choropleth(버블) 렌더.
// 오프라인 안전: 지도 타일 네트워크 의존 없음. RiskTier 색상 매핑.
// (프로덕션에서는 pre-simplified 시군구 GeoJSON 을 배경 폴리곤으로 교체 가능 — README 참고.)
import type { HeatmapRow } from '../api.ts'
import { TIER_COLORS } from '../ui.tsx'

// 대한민국 경위도 경계 박스 (본토+제주 포함 근사)
const KR = { latMin: 33.0, latMax: 38.7, lngMin: 125.8, lngMax: 129.8 }

export function HeatmapMap({
  rows,
  selectedKey,
  onSelect,
}: {
  rows: HeatmapRow[]
  selectedKey: string | null
  onSelect: (row: HeatmapRow) => void
}) {
  const project = (lat: number, lng: number) => ({
    x: ((lng - KR.lngMin) / (KR.lngMax - KR.lngMin)) * 100,
    y: (1 - (lat - KR.latMin) / (KR.latMax - KR.latMin)) * 100,
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0b1a10' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 32% 38%, rgba(21,128,61,.35), transparent 60%), radial-gradient(circle at 68% 72%, rgba(21,128,61,.22), transparent 55%)',
        }}
      />
      {rows.map((r) => {
        const { x, y } = project(r.lat, r.lng)
        const deviation = Number.isFinite(r.deviationPct) ? r.deviationPct : 0
        const size = 18 + Math.min(30, (Math.abs(deviation) / 40) * 30)
        const key = `${r.region}|${r.crop}`
        const active = key === selectedKey
        const c = TIER_COLORS[r.tier] ?? TIER_COLORS.정상
        return (
          <button
            key={key}
            onClick={() => onSelect(r)}
            title={`${r.region} ${r.crop} · ${r.tier}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%,-50%)',
              width: size,
              height: size,
              borderRadius: '50%',
              background: c.border,
              border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,.5)',
              boxShadow: active ? '0 0 0 4px rgba(255,255,255,.3)' : '0 2px 8px rgba(0,0,0,.4)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              zIndex: active ? 5 : 1,
            }}
            aria-label={`${r.region} ${r.crop} ${r.tier}`}
          >
            {r.direction === '+' ? '▲' : '▼'}
          </button>
        )
      })}
      {rows.map((r) => {
        const { x, y } = project(r.lat, r.lng)
        return (
          <span
            key={`${r.region}|${r.crop}-lbl`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `calc(${y}% + 20px)`,
              transform: 'translate(-50%,0)',
              fontSize: 9.5,
              fontWeight: 600,
              color: 'rgba(255,255,255,.85)',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 3px rgba(0,0,0,.7)',
              pointerEvents: 'none',
            }}
          >
            {r.region}
          </span>
        )
      })}
      {rows.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.7)', fontSize: 13 }}>
          이 작물의 등록 데이터가 없습니다
        </div>
      )}
    </div>
  )
}

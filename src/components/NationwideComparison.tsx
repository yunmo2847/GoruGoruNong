import { useEffect, useMemo, useState } from 'react'
import { api, type NationwideComparison as NC, type ComparisonRow } from '../api.ts'
import { card, TierBadge, fmtPyeong, fmtPct, TIER_COLORS } from '../ui.tsx'

type SortKey = 'region' | 'crop' | 'registeredHa' | 'baselineHa' | 'deviationPct' | 'tier'
const TIER_ORDER = { 경계: 3, 주의: 2, 관심: 1, 정상: 0 } as const

export function NationwideComparison() {
  const [data, setData] = useState<NC | null>(null)
  const [error, setError] = useState('')
  const [province, setProvince] = useState('전체')
  const [group, setGroup] = useState('전체')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'deviationPct', dir: -1 })

  useEffect(() => {
    api.comparison().then(setData).catch((e) => setError((e as Error).message))
  }, [])

  const provinces = useMemo(() => (data ? ['전체', ...new Set(data.rows.map((r) => r.province))] : ['전체']), [data])
  const groups = useMemo(() => (data ? ['전체', ...new Set(data.rows.map((r) => r.group))] : ['전체']), [data])

  const rows = useMemo(() => {
    if (!data) return []
    let out = data.rows.filter(
      (r) =>
        (province === '전체' || r.province === province) &&
        (group === '전체' || r.group === group) &&
        (!q || r.region.includes(q) || r.crop.includes(q)),
    )
    out = [...out].sort((a, b) => {
      const k = sort.key
      let cmp: number
      if (k === 'tier') cmp = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
      else if (k === 'region' || k === 'crop') cmp = a[k].localeCompare(b[k])
      else if (k === 'deviationPct') cmp = Math.abs(a.deviationPct) - Math.abs(b.deviationPct)
      else cmp = a[k] - b[k]
      return cmp * sort.dir
    })
    return out
  }, [data, province, group, q, sort])

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }))

  if (error) return <div style={{ ...card, color: '#B91C1C', fontSize: 13 }}>불러오기 실패: {error}</div>
  if (!data) return <div style={{ ...card, color: '#9CA3AF', fontSize: 13 }}>전국 비교 데이터를 불러오는 중…</div>

  const s = data.summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        <SummaryTile label="전체" value={s.totalRows} color="#111827" />
        <SummaryTile label="관심" value={s.watch} color={TIER_COLORS.관심.border} />
        <SummaryTile label="주의" value={s.caution} color={TIER_COLORS.주의.border} />
        <SummaryTile label="경계" value={s.danger} color={TIER_COLORS.경계.border} />
      </div>

      {/* 도별 rollup */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>도별 편차 · 경보</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {data.byProvince.slice(0, 6).map((r) => (
            <RollupRow key={r.key} label={r.key} dev={r.deviationPct} alerts={r.alertCount} rows={r.rows} />
          ))}
        </div>
      </div>

      {/* 작물부류별 rollup */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>작물부류별 편차 · 경보</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {data.byGroup.map((r) => (
            <RollupRow key={r.key} label={r.key} dev={r.deviationPct} alerts={r.alertCount} rows={r.rows} />
          ))}
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="지역·작물 검색" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 120, border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 12px', fontSize: 13 }} />
        <select value={province} onChange={(e) => setProvince(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
          {provinces.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={group} onChange={(e) => setGroup(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
          {groups.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F8FAF9', color: '#6B7280' }}>
                  <Th label="지역" k="region" sort={sort} onSort={toggleSort} />
                  <Th label="작물" k="crop" sort={sort} onSort={toggleSort} />
                  <Th label="등록" k="registeredHa" sort={sort} onSort={toggleSort} align="right" />
                  <Th label="평년" k="baselineHa" sort={sort} onSort={toggleSort} align="right" />
                  <Th label="편차" k="deviationPct" sort={sort} onSort={toggleSort} align="right" />
                  <Th label="등급" k="tier" sort={sort} onSort={toggleSort} align="center" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => <Row key={`${r.region}|${r.crop}`} r={r} />)}
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#9CA3AF' }}>조건에 맞는 데이터가 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* 가로 스크롤 가능함을 알리는 우측 페이드 힌트 */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 22, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.95))', pointerEvents: 'none' }} />
        </div>
        <div style={{ padding: '8px 12px', fontSize: 11, color: '#9CA3AF', borderTop: '1px solid #F0F2F1' }}>
          {rows.length}개 표시 · 전국 {data.rows.length}개 등록 조합 · 좌우로 스크롤하세요
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function RollupRow({ label, dev, alerts, rows }: { label: string; dev: number; alerts: number; rows: number }) {
  const color = dev > 0 ? '#B91C1C' : dev < 0 ? '#1D4ED8' : '#6B7280'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 56, fontSize: 12.5, fontWeight: 600, flex: 'none' }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: '#F0F2F1', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#D1D5DB' }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            background: color,
            borderRadius: 4,
            left: dev >= 0 ? '50%' : `${Math.max(0, 50 - Math.min(50, (Math.abs(dev) / 60) * 50))}%`,
            width: `${Math.min(50, (Math.abs(dev) / 60) * 50)}%`,
          }}
        />
      </div>
      <span style={{ width: 48, fontSize: 11.5, fontWeight: 700, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(dev)}</span>
      <span style={{ width: 40, fontSize: 11, color: '#9CA3AF', textAlign: 'right' }}>경보 {alerts}/{rows}</span>
    </div>
  )
}

function Th({ label, k, sort, onSort, align = 'left' }: { label: string; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; align?: 'left' | 'right' | 'center' }) {
  const active = sort.key === k
  return (
    <th
      onClick={() => onSort(k)}
      style={{ padding: '9px 8px', textAlign: align, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', color: active ? '#15803D' : '#6B7280' }}
    >
      {label}{active ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
    </th>
  )
}

function Row({ r }: { r: ComparisonRow }) {
  const c = TIER_COLORS[r.tier]
  return (
    <tr style={{ borderTop: '1px solid #F0F2F1' }}>
      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 600 }}>{r.region}</div>
        <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{r.province}</div>
      </td>
      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
        <div>{r.crop}</div>
        <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{r.group}</div>
      </td>
      <td style={{ padding: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtPyeong(r.registeredHa)}</td>
      <td style={{ padding: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6B7280', whiteSpace: 'nowrap' }}>{fmtPyeong(r.baselineHa)}</td>
      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: c.border, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {r.direction === '+' ? '▲' : '▼'} {fmtPct(r.deviationPct)}
      </td>
      <td style={{ padding: '8px', textAlign: 'center' }}><TierBadge tier={r.tier} size="sm" /></td>
    </tr>
  )
}

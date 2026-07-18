import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { MarketStats } from '../api.ts'

export function ProductionComparisonChart({ production }: { production: MarketStats['production'] }) {
  const safeProduction = Array.isArray(production) ? production : []
  const years = [...new Set(safeProduction.map((row) => row.year).filter(Number.isFinite))]
  const currentLabel = years.length === 1 ? `${years[0]}년` : '최신연도'
  const averageYears = [...new Set(safeProduction.flatMap((row) => row.averageYears ?? []))].sort()
  const hasAverage = averageYears.length > 0
  const averageLabel = hasAverage
    ? `${averageYears[0]}~${averageYears.at(-1)} 평균`
    : '평년'
  const data = safeProduction.map((row) => ({
    name: row.crop,
    [currentLabel]: row.now,
    [averageLabel]: row.avg,
  }))
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{hasAverage ? '생산량 vs 평년값' : '생산량'}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 10px' }}>
        단위 천 톤 · KOSIS 농작물생산조사
        {!hasAverage && ' · 과거 연도 파일 추가 시 평년 비교 자동 표시'}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 16 }}>
          <CartesianGrid stroke="#F0F2F1" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9.5, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={40}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E5E7EB' }} cursor={{ fill: 'rgba(21,128,61,.06)' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={currentLabel} fill="#15803D" radius={[3, 3, 0, 0]} />
          {hasAverage && <Bar dataKey={averageLabel} fill="#C9D8CE" radius={[3, 3, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

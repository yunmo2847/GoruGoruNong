import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { MarketStats } from '../api.ts'

export function PriceTrendChart({ series }: { series: MarketStats['priceTrend'][number] }) {
  const averageYears = series.averageYears ?? []
  const currentLabel = `${series.year}년`
  const averageLabel = averageYears.length
    ? `${Math.min(...averageYears)}~${Math.max(...averageYears)} 평균`
    : '비교기준'
  const data = (series.months ?? []).map((month) => ({
    name: `${month.month}월`,
    [currentLabel]: month.now,
    [averageLabel]: month.avg,
  }))
  const packageNote = series.packageKg ? ` · 원자료 ${series.packageKg}kg 가격을 kg당으로 환산` : ''
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>가격추이 — {series.crop}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 10px' }}>
        단위 {series.unit} · KAMIS 도매{packageNote}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="#F0F2F1" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} interval={1} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E5E7EB' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey={averageLabel} stroke="#9CA3AF" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          <Line type="monotone" dataKey={currentLabel} stroke="#15803D" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

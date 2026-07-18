// 공통 디자인 토큰 & 소형 프리미티브 — 모바일 프레임 디자인 언어 유지.
import type { CSSProperties, ReactNode } from 'react'
import type { Tier } from './lib/riskFormula.ts'
import { haToPyeong } from './lib/units.ts'

export const TIER_COLORS: Record<Tier, { fill: string; text: string; border: string }> = {
  정상: { fill: '#9CA3AF', text: '#111827', border: '#6B7280' },
  관심: { fill: '#FDE68A', text: '#78350F', border: '#F59E0B' },
  주의: { fill: '#FB923C', text: '#431407', border: '#EA580C' },
  경계: { fill: '#EF4444', text: '#FFFFFF', border: '#B91C1C' },
}

export const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 18,
  padding: 18,
  boxShadow: '0 2px 12px rgba(17,24,39,.05)',
}

export const headerBar: CSSProperties = {
  flex: 'none',
  padding: '52px 22px 16px',
  background: 'linear-gradient(135deg,#166534 0%,#15803D 100%)',
  color: '#fff',
}

export const scrollArea: CSSProperties = { flex: 1, overflowY: 'auto', padding: '16px 22px 96px' }

export const screen: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  animation: 'mfade .25s ease-out',
}

/** 라벨 + 진행률 바 + 퍼센트 숫자. 추천 factor breakdown/기후알림 스코어 등 0~1 값 표시에 공용으로 쓴다. */
export function PercentBar({ label, value, color, labelWidth = 56 }: { label: string; value: number; color: string; labelWidth?: number }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: labelWidth, fontSize: 10.5, color: '#6B7280', flex: 'none' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#F0F2F1', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ width: 30, fontSize: 10.5, color: '#374151', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}</span>
    </div>
  )
}

export function TierBadge({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' }) {
  const c = TIER_COLORS[tier]
  const pad = size === 'sm' ? '3px 10px' : '4px 12px'
  const fs = size === 'sm' ? 11 : 13
  return (
    <span style={{ padding: pad, borderRadius: 99, background: c.fill, color: c.text, fontSize: fs, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {tier}
    </span>
  )
}

/** 내부 ha 값을 사용자 표시용 평 단위 문자열로 변환(서버/내부 계산은 항상 ha 기준 유지). */
export function fmtPyeong(ha: number) {
  return haToPyeong(ha).toLocaleString() + '평'
}
export function fmtPct(n: number) {
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
      {label}
      {children}
      {error && <span style={{ fontSize: 12, color: '#B91C1C', fontWeight: 500 }}>{error}</span>}
    </label>
  )
}

export const inputStyle = (invalid?: boolean): CSSProperties => ({
  border: `1px solid ${invalid ? '#EF4444' : '#E5E7EB'}`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
  width: '100%',
  boxSizing: 'border-box',
})

export const primaryBtn: CSSProperties = {
  border: 'none',
  background: '#15803D',
  color: '#fff',
  cursor: 'pointer',
  padding: 14,
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  width: '100%',
}

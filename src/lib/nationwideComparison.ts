// 전국 비교 집계 — 등록된 모든 시군구×작물 면적을 평년값과 조인하고
// 편차% + RiskTier(riskFormula 재사용)를 계산해 전체 row + 도별/작물부류별 rollup 을 낸다.

import { computeRiskTier, type Tier, type Direction } from './riskFormula.ts'

export interface PlanLike {
  region: string
  province: string
  crop: string
  group: string
  area: number
}

export interface BaselineLike {
  region: string
  crop: string
  baselineHa: number
}

export interface ComparisonRow {
  region: string
  province: string
  crop: string
  group: string
  registeredHa: number
  baselineHa: number
  deviationPct: number
  tier: Tier
  direction: Direction
}

export interface Rollup {
  key: string
  rows: number
  registeredHa: number
  baselineHa: number
  deviationPct: number // 합계 기준 편차
  alertCount: number // 관심/주의/경계 건수
}

export interface NationwideComparison {
  rows: ComparisonRow[]
  byProvince: Rollup[]
  byGroup: Rollup[]
  summary: { totalRows: number; alertCount: number; watch: number; caution: number; danger: number }
}

const ALERT_TIERS: Tier[] = ['관심', '주의', '경계']

function rollup(rows: ComparisonRow[], keyOf: (r: ComparisonRow) => string): Rollup[] {
  const map = new Map<string, ComparisonRow[]>()
  for (const r of rows) {
    const k = keyOf(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  const out: Rollup[] = []
  for (const [key, group] of map) {
    const registeredHa = group.reduce((s, r) => s + r.registeredHa, 0)
    const baselineHa = group.reduce((s, r) => s + r.baselineHa, 0)
    const dev = computeRiskTier(registeredHa, baselineHa).deviationPct
    const alertCount = group.filter((r) => ALERT_TIERS.includes(r.tier)).length
    out.push({ key, rows: group.length, registeredHa, baselineHa, deviationPct: dev, alertCount })
  }
  return out.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))
}

export function buildNationwideComparison(plans: PlanLike[], baseline: BaselineLike[]): NationwideComparison {
  const baseMap = new Map<string, number>()
  for (const b of baseline) baseMap.set(`${b.region}|${b.crop}`, b.baselineHa)

  // 등록 계획을 시군구×작물로 합산
  const agg = new Map<string, ComparisonRow>()
  for (const p of plans) {
    const key = `${p.region}|${p.crop}`
    const baselineHa = baseMap.get(key) ?? 0
    if (!agg.has(key)) {
      agg.set(key, {
        region: p.region,
        province: p.province,
        crop: p.crop,
        group: p.group,
        registeredHa: 0,
        baselineHa,
        deviationPct: 0,
        tier: '정상',
        direction: '+',
      })
    }
    agg.get(key)!.registeredHa += p.area
  }

  const rows: ComparisonRow[] = []
  for (const row of agg.values()) {
    const risk = computeRiskTier(row.registeredHa, row.baselineHa)
    row.deviationPct = risk.deviationPct
    row.tier = risk.tier
    row.direction = risk.direction
    rows.push(row)
  }
  rows.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))

  const summary = {
    totalRows: rows.length,
    alertCount: rows.filter((r) => ALERT_TIERS.includes(r.tier)).length,
    watch: rows.filter((r) => r.tier === '관심').length,
    caution: rows.filter((r) => r.tier === '주의').length,
    danger: rows.filter((r) => r.tier === '경계').length,
  }

  return {
    rows,
    byProvince: rollup(rows, (r) => r.province),
    byGroup: rollup(rows, (r) => r.group),
    summary,
  }
}

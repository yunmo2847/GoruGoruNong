import type { HeatmapRow, MarketStats } from '../api.ts'
import { computeRiskTier, type Tier } from './riskFormula.ts'

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function finite(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function years(value: unknown): number[] {
  return array(value)
    .map((year) => finite(year, NaN))
    .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 2200)
}

function legacyAverageYears(source: string): number[] {
  const match = source.match(/평년\s*(\d{4})\s*[~\-–—]\s*(\d{4})/)
  if (!match) return []
  const start = Number(match[1])
  const end = Number(match[2])
  if (end < start || end - start > 10) return []
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/** 스냅샷 전후 스키마를 모두 현재 MarketStats 계약으로 정규화한다. */
export function normalizeMarketStats(payload: unknown): MarketStats {
  const root = record(payload)
  const generatedAt = text(root.generatedAt, new Date().toISOString())
  const parsedGeneratedYear = new Date(generatedAt).getFullYear()
  const defaultYear = Number.isInteger(parsedGeneratedYear) ? parsedGeneratedYear : new Date().getFullYear()
  const source = text(root.source, '데이터 출처 정보 없음')
  const inferredAverageYears = legacyAverageYears(source)
  const rawProviders = record(root.providers)
  const rawMode = root.mode
  const mode: MarketStats['mode'] = rawMode === 'live' || rawMode === 'mixed' || rawMode === 'offline'
    ? rawMode
    : 'offline'

  const priceTrend = array(root.priceTrend).flatMap((value) => {
    const row = record(value)
    const crop = text(row.crop).trim()
    if (!crop) return []
    const rowYear = finite(row.year, defaultYear)
    const averageYears = Array.isArray(row.averageYears) ? years(row.averageYears) : inferredAverageYears
    const months = array(row.months).flatMap((monthValue) => {
      const month = record(monthValue)
      const monthNumber = finite(month.month, NaN)
      const now = finite(month.now, NaN)
      const avg = finite(month.avg, now)
      if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12 || !Number.isFinite(now)) return []
      return [{ month: monthNumber, now, avg }]
    })
    if (!months.length) return []
    const packageKg = finite(row.packageKg, NaN)
    return [{
      crop,
      unit: text(row.unit, '원/kg'),
      year: rowYear,
      averageYears,
      packageKg: Number.isFinite(packageKg) && packageKg > 0 ? packageKg : null,
      months,
    }]
  })

  const production = array(root.production).flatMap((value) => {
    const row = record(value)
    const crop = text(row.crop).trim()
    const now = finite(row.now, NaN)
    if (!crop || !Number.isFinite(now)) return []
    return [{
      crop,
      now,
      avg: finite(row.avg, now),
      year: finite(row.year, defaultYear),
      averageYears: Array.isArray(row.averageYears) ? years(row.averageYears) : inferredAverageYears,
    }]
  })

  return {
    generatedAt,
    mode,
    source,
    providers: {
      baseline: text(rawProviders.baseline, 'legacy-snapshot'),
      price: text(rawProviders.price, 'legacy-snapshot'),
      production: text(rawProviders.production, 'legacy-snapshot'),
    },
    priceTrend,
    production,
  }
}

const TIERS = new Set<Tier>(['정상', '관심', '주의', '경계'])

/** 지도는 불완전하거나 구형인 행을 보정하고 좌표 없는 행만 제외한다. */
export function normalizeHeatmap(payload: unknown): { rows: HeatmapRow[] } {
  const root = record(payload)
  const rows = array(root.rows).flatMap((value) => {
    const row = record(value)
    const region = text(row.region).trim()
    const crop = text(row.crop).trim()
    const lat = finite(row.lat, NaN)
    const lng = finite(row.lng, NaN)
    if (!region || !crop || !Number.isFinite(lat) || !Number.isFinite(lng)) return []
    const area = Math.max(0, finite(row.area))
    const baselineHa = Math.max(0, finite(row.baselineHa))
    const computed = computeRiskTier(area, baselineHa)
    const tier = TIERS.has(row.tier as Tier) ? row.tier as Tier : computed.tier
    const deviationPct = finite(row.deviationPct, computed.deviationPct)
    const direction = row.direction === '+' || row.direction === '-' ? row.direction : computed.direction
    return [{
      region,
      province: text(row.province),
      crop,
      area,
      baselineHa,
      lat,
      lng,
      deviationPct,
      tier,
      direction,
      over: typeof row.over === 'boolean' ? row.over : computed.over,
    }]
  })
  return { rows }
}

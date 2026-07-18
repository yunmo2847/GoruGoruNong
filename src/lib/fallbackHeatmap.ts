import baselineData from '../data/baseline.json'
import sigunguData from '../data/sigungu.json'
import type { HeatmapRow } from '../api.ts'
import { seededUnit } from './deterministic.ts'
import { computeRiskTier } from './riskFormula.ts'

interface BaselineRow {
  code: string
  region: string
  province: string
  crop: string
  baselineHa: number
  isDemoScenario: boolean
}

const coordinates = new Map(sigunguData.regions.map((region) => [region.name, region]))

/** API 메모리가 비어 있을 때 서버의 데모 시드 규칙을 그대로 재현하는 읽기 전용 안전장치. */
export function fallbackHeatmapRows(): HeatmapRow[] {
  const rows = baselineData.rows as BaselineRow[]
  const output: HeatmapRow[] = []

  for (const row of rows) {
    const isDemo = row.isDemoScenario
    const pick = seededUnit(`${row.code}|${row.crop}|seedpick`)
    if (!isDemo && pick > 0.16) continue
    const ratio = isDemo
      ? 1.46
      : 0.6 + seededUnit(`${row.code}|${row.crop}|seedratio`) * 0.9
    const area = Math.round(row.baselineHa * ratio)
    const coordinate = coordinates.get(row.region)
    if (!coordinate || area <= 0) continue
    output.push({
      region: row.region,
      province: row.province,
      crop: row.crop,
      area,
      baselineHa: row.baselineHa,
      lat: coordinate.lat,
      lng: coordinate.lng,
      ...computeRiskTier(area, row.baselineHa),
    })
  }
  return output
}

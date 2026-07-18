// 서버측 참조데이터 로더 — 동결 스냅샷(baseline/market-stats) 및 마스터(sigungu/crop)를 읽는다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../src/data')

function load<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, name), 'utf8')) as T
}

export interface Region { code: string; name: string; province: string; lat: number; lng: number }
export interface Crop { name: string; group: string; difficulty: number; climateTolerance: number; basePriceKrwPerKg: number; cycleMonths: number }
export interface BaselineRow { code: string; region: string; province: string; crop: string; group: string; baselineHa: number; isDemoScenario: boolean }

export const regions: Region[] = load<{ regions: Region[] }>('sigungu.json').regions
export const crops: Crop[] = load<{ crops: Crop[] }>('cropSuitability.json').crops
const baselineFile = load<{ demoScenario: { region: string; crop: string }; source: string; rows: BaselineRow[] }>('baseline.json')
export const baselineRows: BaselineRow[] = baselineFile.rows
export const demoScenario = baselineFile.demoScenario
export const marketStats = load<Record<string, unknown>>('market-stats.json')

export const regionByName = new Map(regions.map((r) => [r.name, r]))
export const cropByName = new Map(crops.map((c) => [c.name, c]))
export const groupOf = (crop: string) => cropByName.get(crop)?.group ?? '기타'

const baselineMap = new Map(baselineRows.map((r) => [`${r.region}|${r.crop}`, r.baselineHa]))
export function baselineFor(region: string, crop: string): number {
  return baselineMap.get(`${region}|${crop}`) ?? 0
}
export const baselineRecord: Record<string, number> = Object.fromEntries(baselineMap)

export interface ClimateLongtermRow {
  region: string
  droughtRiskScore: number
  floodRiskScore: number
  extremeHeatDays: number
}

export interface SnapshotMeta {
  generatedAt: string | null
  mode: 'offline' | 'mixed' | 'live'
  source: string
}

let climateLongtermRows: ClimateLongtermRow[] = []
export let climateSnapshotMeta: SnapshotMeta = {
  generatedAt: null,
  mode: 'offline',
  source: '장기 기후 스냅샷 없음 · 내장 기준값 사용',
}
try {
  const snapshot = load<{
    generatedAt?: string
    mode?: SnapshotMeta['mode']
    source?: string
    rows: ClimateLongtermRow[]
  }>('climate-longterm.json')
  climateLongtermRows = snapshot.rows
  climateSnapshotMeta = {
    generatedAt: snapshot.generatedAt ?? null,
    mode: snapshot.mode ?? 'offline',
    source: snapshot.source ?? '장기 기후 동결 스냅샷',
  }
} catch {
  climateLongtermRows = [] // scripts/seed-climate.ts 미실행 상태 -> 빈 배열(climateAlert.ts가 mock으로 폴백)
}
const climateLongtermMap = new Map(climateLongtermRows.map((r) => [r.region, r]))
export function climateLongtermFor(region: string): ClimateLongtermRow | null {
  return climateLongtermMap.get(region) ?? null
}

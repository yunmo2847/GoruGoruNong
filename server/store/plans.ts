// 파일 기반 재배계획 저장소 — 재시작 후에도 등록 계획 유지(순수 인메모리 아님).
// 서버 시작 시 demoScenario 포함 초기 계획을 시드해 첫 로드 시 지도가 비지 않게 한다.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { baselineRows, groupOf, regionByName, demoScenario, baselineFor } from '../data.ts'
import { seededUnit } from '../../src/lib/deterministic.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../.data')
const file = resolve(dataDir, 'plans.json')

export interface Plan {
  id: string
  ownerId: string
  region: string
  province: string
  crop: string
  group: string
  area: number
  plant: string | null
  harvest: string | null
  createdAt: string
}

let plans: Plan[] = []

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<Plan>
  return typeof plan.id === 'string'
    && typeof plan.ownerId === 'string'
    && typeof plan.region === 'string'
    && typeof plan.crop === 'string'
    && typeof plan.area === 'number'
    && Number.isFinite(plan.area)
    && plan.area > 0
}

function persist() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(file, JSON.stringify(plans, null, 2))
}

function load() {
  if (existsSync(file)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
      plans = Array.isArray(parsed) ? parsed.filter(isPlan) : []
    } catch {
      plans = []
    }
  }
}

function newId() {
  return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/**
 * 초기 계획 세트를 baseline 행에서 직접 유도(demo 계정 소유).
 * - 모든 시드 계획은 실제 baseline 이 있는 조합이라 편차/tier 가 정상 계산된다.
 * - demoScenario(해남군×배추)는 항상 +46%(경계)로 고정.
 * - 나머지는 결정적 비율(0.6~1.5)로 전국·전작물에 걸쳐 다양한 tier 분포를 만든다.
 */
function seedPlans(ownerId: string) {
  const now = Date.now()
  let i = 0
  const push = (region: string, province: string, crop: string, area: number) => {
    plans.push({
      id: 'seed-' + i,
      ownerId,
      region,
      province,
      crop,
      group: groupOf(crop),
      area: Math.round(area),
      plant: null,
      harvest: null,
      createdAt: new Date(now - i * 1800_000).toISOString(),
    })
    i++
  }

  // 1) demoScenario 고정 (+46% -> 경계)
  const demoBase = baselineFor(demoScenario.region, demoScenario.crop)
  const demoRegion = regionByName.get(demoScenario.region)!
  push(demoScenario.region, demoRegion.province, demoScenario.crop, demoBase * 1.46)

  // 2) baseline 전역에서 결정적으로 표본 추출 -> 전국이 고르게 채워지도록
  for (const row of baselineRows) {
    if (row.isDemoScenario) continue
    const pick = seededUnit(row.code + '|' + row.crop + '|seedpick')
    if (pick > 0.16) continue // 약 1/6 표본 => 지도가 나라 전체에 분포
    const ratio = 0.6 + seededUnit(row.code + '|' + row.crop + '|seedratio') * 0.9 // 0.6~1.5
    push(row.region, row.province, row.crop, row.baselineHa * ratio)
  }
  persist()
}

export function initPlans(demoOwnerId: string) {
  load()
  // 사용자 등록은 보존하되 데모 시드는 서버 시작마다 최신 baseline 기준으로 다시 만든다.
  // 스냅샷 갱신 후 오래된/빈 데모 지도가 남는 문제를 방지한다.
  plans = plans.filter((plan) => !String(plan.id).startsWith('seed-'))
  seedPlans(demoOwnerId)
}

export function allPlans(): Plan[] {
  return plans
}

export function plansByOwner(ownerId: string): Plan[] {
  return plans.filter((p) => p.ownerId === ownerId)
}

export interface NewPlanInput {
  region: string
  crop: string
  area: number
  plant?: string | null
  harvest?: string | null
}

export function addPlan(ownerId: string, input: NewPlanInput): Plan {
  const region = regionByName.get(input.region)!
  const plan: Plan = {
    id: newId(),
    ownerId,
    region: region.name,
    province: region.province,
    crop: input.crop,
    group: groupOf(input.crop),
    area: input.area,
    plant: input.plant ?? null,
    harvest: input.harvest ?? null,
    createdAt: new Date().toISOString(),
  }
  plans.push(plan)
  persist()
  return plan
}

/** 소유자 본인 계획만 삭제. 없거나 본인 소유가 아니면 false. */
export function deletePlan(id: string, ownerId: string): boolean {
  const idx = plans.findIndex((p) => p.id === id && p.ownerId === ownerId)
  if (idx === -1) return false
  plans.splice(idx, 1)
  persist()
  return true
}

/** 지도/추천용: 시군구×작물 -> 등록 총면적 레코드 */
export function registeredRecord(): Record<string, number> {
  const rec: Record<string, number> = {}
  for (const p of plans) {
    const key = `${p.region}|${p.crop}`
    rec[key] = (rec[key] ?? 0) + p.area
  }
  return rec
}

/** heatmap 집계: 작물별 시군구 등록면적 + 좌표 */
export function heatmapAggregate() {
  const rec = registeredRecord()
  const out: Array<{ region: string; province: string; crop: string; area: number; baselineHa: number; lat: number; lng: number }> = []
  const seen = new Set<string>()
  for (const p of plans) {
    const key = `${p.region}|${p.crop}`
    if (seen.has(key)) continue
    seen.add(key)
    const region = regionByName.get(p.region)
    if (!region || !Number.isFinite(rec[key]) || rec[key] <= 0) continue
    out.push({
      region: p.region,
      province: p.province,
      crop: p.crop,
      area: rec[key],
      baselineHa: baselineFor(p.region, p.crop),
      lat: region.lat,
      lng: region.lng,
    })
  }
  return out
}

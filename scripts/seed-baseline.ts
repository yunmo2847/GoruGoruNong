/*
 * seed-baseline.ts — 베이스라인(평년값) & 시장통계 스냅샷 생성기
 * ================================================================
 * 정책(plan 원칙 #5): 정부 참조데이터(KAMIS/KOSIS/MAFRA)는 "동결 스냅샷"이다.
 * 이 스크립트를 한 번 실행해 src/data/baseline.json, src/data/market-stats.json 을
 * 생성하면, 이후 앱 런타임은 네트워크 없이 그 스냅샷만 읽는다.
 *
 * 실연동 경로(fetchLive):
 *   - KOSIS 농작물생산조사 -> 시도×작물 평년 재배면적. 시도값을 그 도의 시군구로 균등 배분(근사).
 *   - 가격추이 -> aT(data.go.kr serviceKey) 우선, 없으면 KAMIS(직접 API), 없으면 합성값.
 *   - MAFRA(data.mafra.go.kr) -> 작물별 생산량(금년/평년) -> 대시보드 생산량 차트.
 *   코드 매핑(품목코드·통계표·서비스명 등)은 src/data/integration-codes.json 에서 주입.
 *   환경변수: KOSIS_KEY(필수), AT_SERVICE_KEY 또는 KAMIS_KEY+KAMIS_ID(가격), MAFRA_KEY(생산량).
 *
 * 폴백: 키가 없거나·통계표/코드가 미설정이거나·호출이 실패하면 각 항목을 결정적 합성값으로
 *   대체한다(데모 신뢰성). 어떤 실패도 앱을 깨지 않는다. -> 로그 끝에 소스별 LIVE/합성 표시.
 *
 * demoScenario: 해남군×배추 를 고정. 초기 시드 계획(server/store)이 이 조합 등록면적을
 *   baseline 대비 +46% 로 넣어 항상 tier='경계' 가 되도록 보장한다.
 */
import '../server/env.ts'
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { seededUnit } from '../src/lib/deterministic.ts'
import { fetchKosisAreas, type KosisConfig } from './integrations/kosis.ts'
import { fetchKamisMonthlyPrice, type KamisConfig, type KamisCreds } from './integrations/kamis.ts'
import { fetchAtMonthlyPrice, type AtConfig } from './integrations/atDataGo.ts'
import { fetchMafraProduction, type MafraConfig, type MafraProduction } from './integrations/mafra.ts'
import {
  loadOfficialFiles,
  type OfficialArea,
  type OfficialProduction,
} from './integrations/officialFiles.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../src/data')

interface Region { code: string; name: string; province: string; lat: number; lng: number }
interface Crop { name: string; group: string; difficulty: number; climateTolerance: number; basePriceKrwPerKg: number; cycleMonths: number }

const regions: Region[] = JSON.parse(readFileSync(resolve(dataDir, 'sigungu.json'), 'utf8')).regions
const crops: Crop[] = JSON.parse(readFileSync(resolve(dataDir, 'cropSuitability.json'), 'utf8')).crops
const codes = JSON.parse(readFileSync(resolve(dataDir, 'integration-codes.json'), 'utf8')) as {
  kamis: KamisConfig
  kosis: KosisConfig
  atDataGo: Omit<AtConfig, 'items'>
  mafra: MafraConfig
}
// aT 는 KAMIS 와 동일한 품목코드 체계를 쓰므로 kamis.items 를 재사용
const atConfig: AtConfig = { ...codes.atDataGo, items: codes.kamis.items }
const HEADLINE = ['배추', '양파', '마늘', '감자', '대파', '고추']
const offline = process.argv.includes('--offline')
const groupOf = (crop: string) => crops.find((c) => c.name === crop)?.group ?? '기타'
const regionsByProvince = new Map<string, Region[]>()
for (const r of regions) {
  if (!regionsByProvince.has(r.province)) regionsByProvince.set(r.province, [])
  regionsByProvince.get(r.province)!.push(r)
}

export const DEMO_SCENARIO = { region: '해남군', crop: '배추' }

export interface BaselineRow {
  code: string
  region: string
  province: string
  crop: string
  group: string
  baselineHa: number
  isDemoScenario: boolean
}
export interface LivePrice {
  crop: string
  year?: number
  averageYears?: number[]
  packageKg?: number | null
  months: { month: number; now: number; avg: number }[]
}
export interface ProductionSeries extends MafraProduction {
  year?: number
  averageYears?: number[]
}
export interface LiveResult {
  baseline: BaselineRow[]
  livePrices: LivePrice[] | null
  priceSource: 'aT' | 'KAMIS' | null
  liveProduction: ProductionSeries[] | null
}

// ── 실연동 ──────────────────────────────────────────────────────────
async function fetchLive(): Promise<LiveResult | null> {
  if (offline) return null
  const kosisKey = process.env.KOSIS_KEY
  if (!kosisKey) return null // 재배면적(baseline)의 실소스가 없으면 전체 폴백

  // 1) KOSIS: 시도×작물 평년 재배면적
  let areas
  try {
    areas = await fetchKosisAreas(codes.kosis, kosisKey)
  } catch (e) {
    console.warn('[seed] KOSIS 호출 실패 -> 폴백:', (e as Error).message)
    return null
  }
  if (!areas || !areas.length) {
    console.warn('[seed] KOSIS 응답 없음(통계표/코드 미설정 가능) -> 폴백')
    return null
  }

  // 2) 시도값을 그 도의 시군구로 균등 배분
  const baseline: BaselineRow[] = []
  for (const a of areas) {
    const sigungus = regionsByProvince.get(a.province)
    if (!sigungus || !sigungus.length) continue
    const per = Math.round(a.areaHa / sigungus.length)
    if (per <= 0) continue
    for (const s of sigungus) {
      baseline.push({
        code: s.code,
        region: s.name,
        province: s.province,
        crop: a.crop,
        group: groupOf(a.crop),
        baselineHa: per,
        isDemoScenario: s.name === DEMO_SCENARIO.region && a.crop === DEMO_SCENARIO.crop,
      })
    }
  }
  ensureDemoScenario(baseline)

  // 3) 가격추이: aT(serviceKey) 우선 -> KAMIS -> 합성.
  let livePrices: LivePrice[] | null = null
  let priceSource: LiveResult['priceSource'] = null
  const atKey = process.env.AT_SERVICE_KEY
  if (atKey) {
    livePrices = await fetchLivePricesAt(atKey)
    if (livePrices) priceSource = 'aT'
  }
  if (!livePrices) {
    const kamisKey = process.env.KAMIS_KEY
    const kamisId = process.env.KAMIS_ID
    if (kamisKey && kamisId) {
      livePrices = await fetchLivePricesKamis({ certKey: kamisKey, certId: kamisId })
      if (livePrices) priceSource = 'KAMIS'
    }
  }

  // 4) MAFRA: 생산량(있으면). 없으면 합성.
  let liveProduction: MafraProduction[] | null = null
  const mafraKey = process.env.MAFRA_KEY
  if (mafraKey) {
    liveProduction = await fetchMafraProduction(codes.mafra, mafraKey)
  }

  return { baseline, livePrices, priceSource, liveProduction }
}

/** aT(data.go.kr) 가격추이: 금년/평년(직전연도) 월별 도매가. */
async function fetchLivePricesAt(serviceKey: string): Promise<LivePrice[] | null> {
  const now = new Date().getFullYear()
  const out: LivePrice[] = []
  for (const crop of HEADLINE) {
    try {
      const cur = await fetchAtMonthlyPrice(crop, now, atConfig, serviceKey)
      const prev = await fetchAtMonthlyPrice(crop, now - 1, atConfig, serviceKey)
      if (!cur) continue
      const prevMap = new Map((prev ?? []).map((p) => [p.month, p.price]))
      out.push({
        crop,
        year: now,
        averageYears: [now - 1],
        packageKg: null,
        months: cur.map((c) => ({ month: c.month, now: c.price, avg: prevMap.get(c.month) ?? c.price })),
      })
    } catch {
      continue
    }
  }
  return out.length ? out : null
}

/** KAMIS 직접 API 가격추이(2차 폴백). */
async function fetchLivePricesKamis(creds: KamisCreds): Promise<LivePrice[] | null> {
  const now = new Date().getFullYear()
  const out: LivePrice[] = []
  for (const crop of HEADLINE) {
    try {
      const cur = await fetchKamisMonthlyPrice(crop, now, codes.kamis, creds)
      const prev = await fetchKamisMonthlyPrice(crop, now - 1, codes.kamis, creds)
      if (!cur) continue
      const prevMap = new Map((prev ?? []).map((p) => [p.month, p.price]))
      out.push({
        crop,
        year: now,
        averageYears: [now - 1],
        packageKg: null,
        months: cur.map((c) => ({ month: c.month, now: c.price, avg: prevMap.get(c.month) ?? c.price })),
      })
    } catch {
      continue
    }
  }
  return out.length ? out : null
}

function ensureDemoScenario(rows: BaselineRow[]) {
  if (rows.some((x) => x.isDemoScenario)) return
  const r = regions.find((x) => x.name === DEMO_SCENARIO.region)!
  const c = crops.find((x) => x.name === DEMO_SCENARIO.crop)!
  rows.push({ code: r.code, region: r.name, province: r.province, crop: c.name, group: c.group, baselineHa: 2600, isDemoScenario: true })
}

// ── 폴백(결정적 합성) ────────────────────────────────────────────────
function buildFallback(): BaselineRow[] {
  const rows: BaselineRow[] = []
  for (const r of regions) {
    const picked: Crop[] = []
    for (const c of crops) {
      if (seededUnit(r.code + ':' + c.name) < 0.32) picked.push(c)
      if (picked.length >= 6) break
    }
    let i = 0
    while (picked.length < 3 && i < crops.length) {
      if (!picked.includes(crops[i])) picked.push(crops[i])
      i++
    }
    for (const c of picked) {
      const u = seededUnit(r.code + '|' + c.name + '|base')
      const baselineHa = Math.round(200 + u * 3200)
      const isDemo = r.name === DEMO_SCENARIO.region && c.name === DEMO_SCENARIO.crop
      rows.push({ code: r.code, region: r.name, province: r.province, crop: c.name, group: c.group, baselineHa, isDemoScenario: isDemo })
    }
  }
  ensureDemoScenario(rows)
  return rows
}

/** KOSIS XLS의 최신 시도 면적을 시군구에 균등 배분하고, 파일에 없는 품목만 폴백으로 보완한다. */
function buildOfficialBaseline(areas: OfficialArea[]): BaselineRow[] {
  const latestYearByCrop = new Map<string, number>()
  for (const area of areas) {
    latestYearByCrop.set(area.crop, Math.max(latestYearByCrop.get(area.crop) ?? 0, area.year))
  }
  const officialCrops = new Set(latestYearByCrop.keys())
  const rows = buildFallback().filter((row) => !officialCrops.has(row.crop))

  for (const area of areas) {
    if (area.year !== latestYearByCrop.get(area.crop)) continue
    const sigungus = regionsByProvince.get(area.province)
    if (!sigungus?.length) continue
    const perRegionHa = Math.round(area.areaHa / sigungus.length)
    if (perRegionHa <= 0) continue
    for (const region of sigungus) {
      rows.push({
        code: region.code,
        region: region.name,
        province: region.province,
        crop: area.crop,
        group: groupOf(area.crop),
        baselineHa: perRegionHa,
        isDemoScenario: region.name === DEMO_SCENARIO.region && area.crop === DEMO_SCENARIO.crop,
      })
    }
  }
  ensureDemoScenario(rows)
  return rows
}

function buildOfficialProduction(rows: OfficialProduction[]): ProductionSeries[] {
  const byCrop = new Map<string, OfficialProduction[]>()
  for (const row of rows) {
    if (!byCrop.has(row.crop)) byCrop.set(row.crop, [])
    byCrop.get(row.crop)!.push(row)
  }

  const DEMO_AVG_WINDOW = 5
  const result: ProductionSeries[] = []
  for (const [crop, series] of byCrop) {
    series.sort((a, b) => b.year - a.year)
    const current = series[0]
    const history = series.slice(1, 6)
    let averageTons: number
    let averageYears: number[]
    if (history.length) {
      averageTons = history.reduce((sum, row) => sum + row.tons, 0) / history.length
      averageYears = history.map((row) => row.year)
    } else {
      // 공식 파일에 과거 연도가 없으면 평년 비교가 사라진다. 데모 신뢰성을 위해
      // 현재값 대비 ±15% 의 결정적 평년값과 데모 평년기간을 합성한다(항상 평년 비교가 보이도록).
      averageTons = current.tons * (0.85 + seededUnit(crop + ':prodavg-demo') * 0.3)
      averageYears = Array.from({ length: DEMO_AVG_WINDOW }, (_, k) => current.year - DEMO_AVG_WINDOW + k)
    }
    const toKtons = (tons: number) => Math.round(tons / 100) / 10
    result.push({
      crop,
      year: current.year,
      averageYears,
      nowKtons: toKtons(current.tons),
      avgKtons: toKtons(averageTons),
    })
  }
  return result.sort((a, b) => b.nowKtons - a.nowKtons)
}

// ── 시장통계 ─────────────────────────────────────────────────────────
function buildMarketStats(
  baseline: BaselineRow[],
  livePrices: LivePrice[] | null,
  liveProduction: ProductionSeries[] | null,
  snapshot: {
    generatedAt: string
    mode: 'offline' | 'mixed' | 'live'
    source: string
    providers: { baseline: string; price: string; production: string }
  },
) {
  const priceTrend = HEADLINE.map((crop) => {
    const live = livePrices?.find((p) => p.crop === crop)
    if (live && live.months.length) {
      return {
        crop,
        unit: '원/kg',
        year: live.year ?? new Date().getFullYear(),
        averageYears: live.averageYears ?? [],
        packageKg: live.packageKg ?? null,
        months: live.months,
      }
    }
    // 합성 폴백
    const c = crops.find((x) => x.name === crop)!
    const months = Array.from({ length: 12 }, (_, m) => ({
      month: m + 1,
      now: Math.round(c.basePriceKrwPerKg * (0.8 + seededUnit(`${crop}:now:${m}`) * 0.6)),
      avg: Math.round(c.basePriceKrwPerKg * (0.9 + seededUnit(`${crop}:avg:${m}`) * 0.3)),
    }))
    return {
      crop,
      unit: '원/kg',
      year: new Date().getFullYear(),
      averageYears: [],
      packageKg: null,
      months,
    }
  })

  // 생산량 파일이 있으면 실제 통계만 표시한다. 파일이 없을 때만 재배면적 기반 합성을 쓴다.
  if (liveProduction?.length) {
    const production = liveProduction.slice(0, 8).map((row) => ({
      crop: row.crop,
      now: row.nowKtons,
      avg: row.avgKtons,
      year: row.year ?? new Date().getFullYear(),
      averageYears: row.averageYears ?? [],
    }))
    return { ...snapshot, priceTrend, production }
  }

  const byCrop: Record<string, number> = {}
  for (const row of baseline) byCrop[row.crop] = (byCrop[row.crop] || 0) + row.baselineHa
  const production = Object.entries(byCrop)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([crop, ha]) => {
      const avgKtons = Math.round((ha / 100) * (8 + seededUnit(crop + ':prodavg') * 4))
      const nowKtons = Math.round(avgKtons * (0.75 + seededUnit(crop + ':prodnow') * 0.55))
      return {
        crop,
        now: nowKtons,
        avg: avgKtons,
        year: new Date().getFullYear(),
        averageYears: [],
      }
    })

  return {
    ...snapshot,
    priceTrend,
    production,
  }
}

async function main() {
  const official = loadOfficialFiles()
  const live = await fetchLive()
  const hasOfficialAreas = official.areas.length > 0
  const hasOfficialPrices = official.prices.length > 0
  const hasOfficialProduction = official.production.length > 0
  const baseline = hasOfficialAreas ? buildOfficialBaseline(official.areas) : live?.baseline ?? buildFallback()
  const prices: LivePrice[] | null = hasOfficialPrices ? official.prices : live?.livePrices ?? null
  const production = hasOfficialProduction ? buildOfficialProduction(official.production) : live?.liveProduction ?? null
  const areaYears = [...new Set(official.areas.map((row) => row.year))].sort()
  const priceYears = [...new Set(official.prices.map((row) => row.year))].sort()
  const productionYears = [...new Set(official.production.map((row) => row.year))].sort()
  const providers = {
    baseline: hasOfficialAreas
      ? `KOSIS-XLS (${areaYears.join(', ')}, 미수록 품목은 기준값 보완)`
      : live ? 'KOSIS' : 'deterministic-snapshot',
    price: hasOfficialPrices
      ? `KAMIS-XLS (${priceYears.join(', ')})`
      : live?.priceSource ?? 'deterministic-snapshot',
    production: hasOfficialProduction
      ? `KOSIS-XLS (${productionYears.join(', ')})`
      : live?.liveProduction ? 'MAFRA' : 'deterministic-snapshot',
  }
  const usesOfficialFiles = hasOfficialAreas || hasOfficialPrices || hasOfficialProduction
  const liveProviderCount = Object.values(providers).filter((provider) => !provider.includes('deterministic-snapshot')).length
  const mode: 'offline' | 'mixed' | 'live' = usesOfficialFiles
    ? 'offline'
    : liveProviderCount === 3 ? 'live' : liveProviderCount > 0 ? 'mixed' : 'offline'
  const generatedAt = new Date().toISOString()
  const source =
    usesOfficialFiles
      ? `공식 파일 기반 오프라인 스냅샷 · 가격 KAMIS ${priceYears.at(-1) ?? '-'}년 · 재배면적/생산량 KOSIS ${productionYears.at(-1) ?? areaYears.at(-1) ?? '-'}년`
      : mode === 'offline'
      ? '내장 기준값 기반 오프라인 스냅샷 · 외부 API 미사용'
      : `동결 스냅샷 · KOSIS:${providers.baseline} · 가격:${providers.price} · 생산량:${providers.production}`
  const snapshot = { generatedAt, mode, source, providers }
  const marketStats = buildMarketStats(baseline, prices, production, snapshot)

  writeFileSync(
    resolve(dataDir, 'baseline.json'),
    JSON.stringify({ demoScenario: DEMO_SCENARIO, ...snapshot, rows: baseline }, null, 2),
  )
  writeFileSync(resolve(dataDir, 'market-stats.json'), JSON.stringify(marketStats, null, 2))

  const provinces = new Set(baseline.map((r) => r.province))
  const cropSet = new Set(baseline.map((r) => r.crop))
  const areaMode = hasOfficialAreas ? 'FILE-KOSIS' : live ? 'LIVE-KOSIS' : 'synthetic-area'
  const priceMode = hasOfficialPrices ? 'FILE-KAMIS' : live?.priceSource ? `LIVE-${live.priceSource}` : 'synthetic-price'
  const prodMode = hasOfficialProduction ? 'FILE-KOSIS' : live?.liveProduction ? 'LIVE-MAFRA' : 'synthetic-prod'
  console.log(
    `[seed] mode=${mode}, baseline rows=${baseline.length}, 도/광역시=${provinces.size}, 작물=${cropSet.size}, ` +
      `demoScenario=${DEMO_SCENARIO.region}×${DEMO_SCENARIO.crop} | 재배면적:${areaMode} 가격:${priceMode} 생산량:${prodMode}`,
  )
}

main()

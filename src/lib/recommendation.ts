// 대체작물 추천 스코어링 엔진.
// 단일 fallback 조회가 아니라, 후보 작물마다 4개 인자를 가중 합산해 랭킹한다.
//   수익성 · 기후적합도 · 수급여유도 · 전환용이성
// 가중치는 아래 WEIGHTS 하나에만 존재(tunable). 각 후보는 per-factor breakdown + total 을 반환.

import { computeClimateRisk } from './climateRisk.ts'
import cropData from '../data/cropSuitability.json'

export interface Crop {
  name: string
  group: string
  difficulty: number
  climateTolerance: number
  basePriceKrwPerKg: number
  cycleMonths: number
}
const CROPS = cropData.crops as Crop[]

// ── 가중치 (합=1). 한 곳에서만 조정 ──
export const WEIGHTS = {
  profitability: 0.3, // 수익성
  climate: 0.3, // 기후적합도
  headroom: 0.25, // 수급여유도
  ease: 0.15, // 전환용이성(재배난이도+부류유사)
} as const

export interface Factors {
  profitability: number // 0~1
  climate: number // 0~1 (기후적합도)
  headroom: number // 0~1 (평년 대비 여유)
  ease: number // 0~1 (전환 용이성)
}

export interface Candidate {
  crop: string
  group: string
  factors: Factors
  score: number // 0~100
}

/** 기후적합도 공급자 인터페이스. real-API 어댑터 시도 -> static 폴백, 실패 시 자동. */
export interface SuitabilityProvider {
  readonly kind: 'real' | 'static'
  getSuitability(region: string, crop: string): number // 0~1
}

const staticProvider: SuitabilityProvider = {
  kind: 'static',
  getSuitability: (region, crop) => computeClimateRisk(region, crop).suitability,
}

/** 실 API 어댑터 자리표시자 — 미구현이므로 호출 시 throw. */
function tryRealProvider(): SuitabilityProvider {
  return {
    kind: 'real',
    getSuitability() {
      throw new Error('real suitability API not available')
    },
  }
}

/** 어댑터 실패 시 자동으로 static 폴백을 감싼 공급자를 반환. */
export function resolveSuitabilityProvider(preferReal = false): SuitabilityProvider {
  if (!preferReal) return staticProvider
  const real = tryRealProvider()
  return {
    kind: 'real',
    getSuitability(region, crop) {
      try {
        return real.getSuitability(region, crop)
      } catch {
        return staticProvider.getSuitability(region, crop) // 자동 폴백
      }
    },
  }
}

// 수익성 정규화용 가격 min/max (작물 마스터 기준, 1회 계산)
const prices = CROPS.map((c) => c.basePriceKrwPerKg)
const PRICE_MIN = Math.min(...prices)
const PRICE_MAX = Math.max(...prices)

function profitabilityOf(crop: Crop): number {
  if (PRICE_MAX === PRICE_MIN) return 0.5
  return (crop.basePriceKrwPerKg - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)
}

function easeOf(candidate: Crop, source: Crop | undefined): number {
  const difficultyScore = 1 - (candidate.difficulty - 1) / 4 // 1(쉬움)~5(어려움) -> 1~0
  const groupBonus = source && candidate.group === source.group ? 0.15 : 0
  return Math.min(1, difficultyScore * 0.85 + groupBonus)
}

/** 순수 결합 함수 — 인자 하나가 오르면 total 이 오른다(가중치 양수). 테스트에서 monotonicity 검증. */
export function combineScore(f: Factors, w: typeof WEIGHTS = WEIGHTS): number {
  const raw = f.profitability * w.profitability + f.climate * w.climate + f.headroom * w.headroom + f.ease * w.ease
  return Math.round(raw * 1000) / 10 // 0~100, 소수1자리
}

export interface RecoContext {
  /** `${region}|${crop}` -> 평년값 baselineHa */
  baseline: Record<string, number>
  /** `${region}|${crop}` -> 현재 등록 총면적 ha */
  registered: Record<string, number>
  provider?: SuitabilityProvider
}

/** 지역·원작물에 대한 대체작물 랭킹 리스트. 결정적 정렬. */
export function scoreCandidates(region: string, sourceCrop: string, ctx: RecoContext): Candidate[] {
  const provider = ctx.provider ?? staticProvider
  const source = CROPS.find((c) => c.name === sourceCrop)
  const out: Candidate[] = []

  for (const c of CROPS) {
    if (c.name === sourceCrop) continue // 원작물 제외
    const climate = provider.getSuitability(region, c.name)
    if (climate < 0.25) continue // 기후 부적합 후보 제외

    const key = `${region}|${c.name}`
    const base = ctx.baseline[key]
    const reg = ctx.registered[key] ?? 0
    // 수급여유도: 평년 대비 등록이 적을수록 여유가 크다. baseline 없으면 중립.
    const headroom = base && base > 0 ? Math.min(1, Math.max(0, (base - reg) / base)) : 0.5

    const factors: Factors = {
      profitability: profitabilityOf(c),
      climate,
      headroom,
      ease: easeOf(c, source),
    }
    out.push({ crop: c.name, group: c.group, factors, score: combineScore(factors) })
  }

  // 점수 내림차순, 동점은 작물명으로 안정 정렬(결정적)
  out.sort((a, b) => b.score - a.score || a.crop.localeCompare(b.crop))
  return out
}

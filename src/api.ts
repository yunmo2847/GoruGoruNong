// 프론트엔드 API 클라이언트. 모든 요청은 세션 쿠키 포함(credentials: 'include').
// /api 는 vite dev 프록시를 통해 Express(5174)로 전달된다.
import type { Tier, Direction } from './lib/riskFormula.ts'
import { normalizeHeatmap, normalizeMarketStats } from './lib/apiPayload.ts'

export interface User {
  id: string
  email: string
  name: string
}

export interface HeatmapRow {
  region: string
  province: string
  crop: string
  area: number
  baselineHa: number
  lat: number
  lng: number
  deviationPct: number
  tier: Tier
  direction: Direction
  over: boolean
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
  deviationPct: number
  alertCount: number
}

export interface NationwideComparison {
  rows: ComparisonRow[]
  byProvince: Rollup[]
  byGroup: Rollup[]
  summary: { totalRows: number; alertCount: number; watch: number; caution: number; danger: number }
}

export interface Factors {
  profitability: number
  climate: number
  headroom: number
  ease: number
}
export interface Candidate {
  crop: string
  group: string
  factors: Factors
  score: number
}
export interface Recommendation {
  region: string
  sourceCrop: string
  weights: Factors
  providerKind: 'real' | 'static'
  candidates: Candidate[]
}

export interface ClimateRisk {
  region: string
  crop: string
  score: number
  label: '낮음' | '보통' | '높음'
  suitability: number
}

export interface RiskResult {
  region: string | null
  crop: string | null
  registeredHa: number
  baselineHa: number
  deviationPct: number
  tier: Tier
  direction: Direction
  over: boolean
}

export interface MarketStats {
  generatedAt: string
  mode: 'offline' | 'mixed' | 'live'
  source: string
  providers: { baseline: string; price: string; production: string }
  priceTrend: {
    crop: string
    unit: string
    year: number
    averageYears: number[]
    packageKg: number | null
    months: { month: number; now: number; avg: number }[]
  }[]
  production: { crop: string; now: number; avg: number; year: number; averageYears: number[] }[]
}

export interface ClimateAlert {
  region: string
  crop: string
  weatherScore: number
  pestScore: number
  longtermScore: number
  totalScore: number
  growthStage: '초기' | '생육기' | '수확기'
  tier: '정상' | '주의' | '경보'
  immediateAlert: boolean
  controlGuidance: boolean
  recommendTrigger: boolean
  recommendations: string[]
  precautions: string[]
  snapshot: {
    generatedAt: string | null
    mode: 'offline' | 'mixed' | 'live'
    source: string
  }
}

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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : {}
  if (!res.ok) throw new ApiError(body.error || `요청 실패 (${res.status})`, res.status)
  return body as T
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const api = {
  // auth
  me: () => req<{ user: User }>('/auth/me'),
  login: (email: string, password: string) =>
    req<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, name: string, password: string) =>
    req<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, name, password }) }),
  logout: () => req<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  // data
  heatmap: async () => normalizeHeatmap(await req<unknown>('/map/heatmap')),
  comparison: () => req<NationwideComparison>('/comparison/nationwide'),
  recommendation: (region: string, crop: string) =>
    req<Recommendation>(`/recommendation/${encodeURIComponent(region)}/${encodeURIComponent(crop)}`),
  climateRisk: (region: string, crop: string) =>
    req<ClimateRisk>(`/climate-risk/${encodeURIComponent(region)}/${encodeURIComponent(crop)}`),
  climateAlert: (region: string, crop: string) =>
    req<ClimateAlert>(`/climate-alert/${encodeURIComponent(region)}/${encodeURIComponent(crop)}`),
  risk: (region: string, crop: string) =>
    req<RiskResult>(`/risk?region=${encodeURIComponent(region)}&crop=${encodeURIComponent(crop)}`),
  marketStats: async () => normalizeMarketStats(await req<unknown>('/market-stats')),

  // plans
  myPlans: () => req<{ plans: Plan[] }>('/plans/mine'),
  createPlan: (input: { region: string; crop: string; area: number; plant?: string; harvest?: string }) =>
    req<{ plan: Plan }>('/plans', { method: 'POST', body: JSON.stringify(input) }),
  deletePlan: (id: string) => req<{ ok: boolean }>(`/plans/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

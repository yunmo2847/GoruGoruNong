// 기후·병충해 위험도 알림 — S_weather/S_pest/S_longterm 개별 스코어 + 생육단계 가중 합산 + 알림 분기.
// 실 관측/예찰 데이터가 있으면 그 값을 쓰고, 없으면 기존 climateRisk.ts 결정적 mock으로 대체(폴백).
import { computeClimateRisk } from './climateRisk.ts'

export interface WeatherInput {
  tempC: number | null
  humidityPct: number | null
  precipMm: number | null
}
export interface PestInput {
  riskLevel: '낮음' | '보통' | '높음' | null
}
export interface LongtermInput {
  droughtRiskScore: number | null // 0~1
  floodRiskScore: number | null // 0~1
  extremeHeatDays: number | null // 연간 폭염일수 전망
}

/** S_weather — 실 관측(기온/습도/강수) 기반, 없으면 climateRisk mock으로 대체. 0~1. */
export function computeWeatherScore(input: WeatherInput, region: string, crop: string): number {
  if (input.tempC == null && input.humidityPct == null && input.precipMm == null) {
    return computeClimateRisk(region, crop).score / 100
  }
  let score = 0
  if (input.tempC != null) {
    if (input.tempC >= 35 || input.tempC <= -10) score += 0.5
    else if (input.tempC >= 30 || input.tempC <= -5) score += 0.25
  }
  if (input.precipMm != null) {
    if (input.precipMm >= 80) score += 0.4
    else if (input.precipMm >= 30) score += 0.2
  }
  if (input.humidityPct != null && input.humidityPct >= 90) score += 0.1
  return Math.min(1, score)
}

/** S_pest — NCPMS 예찰 등급 기반, 없으면 climateRisk mock(0~1)으로 대체. */
export function computePestScore(input: PestInput, region: string, crop: string): number {
  if (input.riskLevel == null) {
    return computeClimateRisk(region, crop).score / 100
  }
  return input.riskLevel === '높음' ? 0.9 : input.riskLevel === '보통' ? 0.5 : 0.15
}

/** S_longterm — ARCCAS 장기 시나리오(가뭄/홍수/폭염일수) 기반, 없으면 climateRisk mock. 0~1. */
export function computeLongtermScore(input: LongtermInput, region: string, crop: string): number {
  if (input.droughtRiskScore == null && input.floodRiskScore == null && input.extremeHeatDays == null) {
    return computeClimateRisk(region, crop).score / 100
  }
  const drought = input.droughtRiskScore ?? 0
  const flood = input.floodRiskScore ?? 0
  const heat = input.extremeHeatDays != null ? Math.min(1, input.extremeHeatDays / 60) : 0
  return Math.min(1, ((drought + flood + heat) / 3) * 1.2)
}

// ── 생육단계 ──────────────────────────────────────────────────────────
export type GrowthStage = '초기' | '생육기' | '수확기'

/** 등록계획의 plant/harvest(YYYY-MM)로부터 경과율을 계산해 3단계로 구분. 정보 없으면 '생육기'(중립). */
export function computeGrowthStage(plant: string | null, harvest: string | null, today: Date = new Date()): GrowthStage {
  if (!plant || !harvest) return '생육기'
  const p = new Date(`${plant}-01`)
  const h = new Date(`${harvest}-01`)
  const total = h.getTime() - p.getTime()
  if (total <= 0) return '생육기'
  const pct = (today.getTime() - p.getTime()) / total
  if (pct < 0.25) return '초기'
  if (pct < 0.75) return '생육기'
  return '수확기'
}

/** 생육단계별 인자 가중 배수 — 초기: 서리/병해충 민감, 수확기: 기상(강우 등) 민감·병해충 상대적 둔감. */
export const GROWTH_STAGE_WEIGHTS: Record<GrowthStage, { weather: number; pest: number; longterm: number }> = {
  초기: { weather: 1.3, pest: 1.2, longterm: 0.6 },
  생육기: { weather: 1.0, pest: 1.0, longterm: 1.0 },
  수확기: { weather: 1.4, pest: 0.7, longterm: 0.8 },
}

/** 3개 인자의 가중치(합=1) — 조정은 여기 한 곳에서만. */
export const ALERT_WEIGHTS = {
  weather: 0.4,
  pest: 0.35,
  longterm: 0.25,
} as const

export interface AlertScoreInput {
  weather: WeatherInput
  pest: PestInput
  longterm: LongtermInput
  region: string
  crop: string
  growthStage: GrowthStage
}

export interface AlertScoreResult {
  weatherScore: number
  pestScore: number
  longtermScore: number
  totalScore: number // 0~100
  growthStage: GrowthStage
}

/** 생육단계 가중치를 적용한 종합 위험도(0~100). 인자 하나가 오르면 total도 오른다(monotonic). */
export function combineAlertScore(input: AlertScoreInput, weights: typeof ALERT_WEIGHTS = ALERT_WEIGHTS): AlertScoreResult {
  const weatherScore = computeWeatherScore(input.weather, input.region, input.crop)
  const pestScore = computePestScore(input.pest, input.region, input.crop)
  const longtermScore = computeLongtermScore(input.longterm, input.region, input.crop)
  const stageW = GROWTH_STAGE_WEIGHTS[input.growthStage]
  const raw =
    weatherScore * weights.weather * stageW.weather +
    pestScore * weights.pest * stageW.pest +
    longtermScore * weights.longterm * stageW.longterm
  const totalScore = Math.min(100, Math.round(raw * 1000) / 10)
  return { weatherScore, pestScore, longtermScore, totalScore, growthStage: input.growthStage }
}

// ── 임계값 알림 분기 ──────────────────────────────────────────────────
export type AlertTier = '정상' | '주의' | '경보'

export function alertTierOf(totalScore: number): AlertTier {
  if (totalScore >= 70) return '경보'
  if (totalScore >= 40) return '주의'
  return '정상'
}

export interface AlertBranch {
  tier: AlertTier
  immediateAlert: boolean // 즉시알림 — 종합 점수가 경보 단계
  controlGuidance: boolean // 방제안내 — 병충해 축 단독 위험이 일정 수준 이상(전체 tier와 무관)
  recommendTrigger: boolean // 대체작물 추천 트리거 — 병충해가 원인이 되어 경보에 도달했을 때만
}

/** totalScore/pestScore로부터 3가지 알림 분기를 결정. 각기 다른 조건이라 조합이 갈린다. */
export function branchAlert(totalScore: number, pestScore: number): AlertBranch {
  const tier = alertTierOf(totalScore)
  const pestHigh = pestScore >= 0.5
  return {
    tier,
    immediateAlert: tier === '경보',
    controlGuidance: pestHigh,
    recommendTrigger: tier === '경보' && pestHigh,
  }
}

// ── 권장사항 / 주의점 ────────────────────────────────────────────────
export interface Advisory {
  recommendations: string[] // 권장사항 — 지금 하면 좋은 조치
  precautions: string[] // 주의점 — 위험 요인 경고
}

/** 개별 스코어·생육단계로부터 구체적인 권장사항/주의점 문구를 결정적으로 생성. */
export function generateAdvisories(score: AlertScoreResult): Advisory {
  const recommendations: string[] = []
  const precautions: string[] = []

  if (score.weatherScore >= 0.7) {
    precautions.push('기상 위험이 높습니다 — 극한 고온·강우 대비 관수·배수 시설을 점검하세요.')
    recommendations.push('한랭사·차광막 등 임시 보호 조치를 준비하세요.')
  } else if (score.weatherScore >= 0.4) {
    precautions.push('기상 변동성이 있습니다 — 일일 기상예보를 확인하세요.')
  }

  if (score.pestScore >= 0.7) {
    precautions.push('병충해 위험이 높습니다 — 예찰을 강화하고 방제 시기를 앞당기세요.')
    recommendations.push('인근 농가와 병해충 발생 정보를 공유하고 공동 방제를 고려하세요.')
  } else if (score.pestScore >= 0.4) {
    recommendations.push('정기적인 포장 점검으로 병해충을 조기에 발견하세요.')
  }

  if (score.longtermScore >= 0.7) {
    precautions.push('장기 기후 시나리오상 가뭄·홍수 위험이 높은 지역입니다.')
    recommendations.push('관개 시설 확충이나 배수로 정비 등 중장기 대응을 검토하세요.')
  }

  if (score.growthStage === '초기') {
    recommendations.push('초기 생육 단계 — 서리·냉해 피해에 특히 주의하세요.')
  } else if (score.growthStage === '수확기') {
    precautions.push('수확기 — 강우 시 수확 시기를 조정해 품질 저하를 예방하세요.')
  }

  if (recommendations.length === 0) recommendations.push('현재 특별한 조치가 필요하지 않습니다. 평년 수준의 관리를 유지하세요.')
  if (precautions.length === 0) precautions.push('뚜렷한 주의사항이 없습니다.')

  return { recommendations, precautions }
}

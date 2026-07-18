import { describe, it, expect } from 'vitest'
import {
  computeWeatherScore,
  computePestScore,
  computeLongtermScore,
  combineAlertScore,
  computeGrowthStage,
  branchAlert,
  alertTierOf,
  generateAdvisories,
  ALERT_WEIGHTS,
  GROWTH_STAGE_WEIGHTS,
  type AlertScoreInput,
  type AlertScoreResult,
} from './climateAlert.ts'

describe('computeWeatherScore', () => {
  it('실 관측 없으면 climateRisk mock으로 폴백(결정적)', () => {
    const a = computeWeatherScore({ tempC: null, humidityPct: null, precipMm: null }, '해남군', '배추')
    const b = computeWeatherScore({ tempC: null, humidityPct: null, precipMm: null }, '해남군', '배추')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
  })
  it('극한 기온+강수 조합이 온화한 조건보다 높은 점수', () => {
    const extreme = computeWeatherScore({ tempC: 36, humidityPct: 92, precipMm: 90 }, '해남군', '배추')
    const mild = computeWeatherScore({ tempC: 22, humidityPct: 50, precipMm: 0 }, '해남군', '배추')
    expect(extreme).toBeGreaterThan(mild)
  })
})

describe('computePestScore', () => {
  it('riskLevel 순서: 높음 > 보통 > 낮음', () => {
    const high = computePestScore({ riskLevel: '높음' }, '해남군', '배추')
    const mid = computePestScore({ riskLevel: '보통' }, '해남군', '배추')
    const low = computePestScore({ riskLevel: '낮음' }, '해남군', '배추')
    expect(high).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(low)
  })
})

describe('computeLongtermScore', () => {
  it('가뭄+홍수+폭염일수 모두 높으면 낮은 조건보다 점수 높음', () => {
    const high = computeLongtermScore({ droughtRiskScore: 0.9, floodRiskScore: 0.8, extremeHeatDays: 50 }, '해남군', '배추')
    const low = computeLongtermScore({ droughtRiskScore: 0.1, floodRiskScore: 0.1, extremeHeatDays: 5 }, '해남군', '배추')
    expect(high).toBeGreaterThan(low)
  })
})

describe('computeGrowthStage', () => {
  it('경과율 25% 미만은 초기', () => {
    expect(computeGrowthStage('2026-01', '2026-05', new Date('2026-01-20'))).toBe('초기')
  })
  it('경과율 25~75%는 생육기', () => {
    expect(computeGrowthStage('2026-01', '2026-05', new Date('2026-03-01'))).toBe('생육기')
  })
  it('경과율 75% 이상은 수확기', () => {
    expect(computeGrowthStage('2026-01', '2026-05', new Date('2026-04-25'))).toBe('수확기')
  })
  it('plant/harvest 없으면 생육기(중립)', () => {
    expect(computeGrowthStage(null, null)).toBe('생육기')
  })
})

describe('combineAlertScore — 단조성', () => {
  const base: AlertScoreInput = {
    weather: { tempC: 25, humidityPct: 60, precipMm: 10 },
    pest: { riskLevel: '보통' },
    longterm: { droughtRiskScore: 0.3, floodRiskScore: 0.3, extremeHeatDays: 10 },
    region: '해남군',
    crop: '배추',
    growthStage: '생육기',
  }
  it('가중치 합은 1', () => {
    expect(ALERT_WEIGHTS.weather + ALERT_WEIGHTS.pest + ALERT_WEIGHTS.longterm).toBeCloseTo(1, 5)
  })
  it('weather 인자 증가 -> total 증가', () => {
    const lower = combineAlertScore({ ...base, weather: { tempC: 20, humidityPct: 40, precipMm: 0 } })
    const higher = combineAlertScore({ ...base, weather: { tempC: 36, humidityPct: 95, precipMm: 90 } })
    expect(higher.totalScore).toBeGreaterThan(lower.totalScore)
  })
  it('pest 인자 증가 -> total 증가', () => {
    const lower = combineAlertScore({ ...base, pest: { riskLevel: '낮음' } })
    const higher = combineAlertScore({ ...base, pest: { riskLevel: '높음' } })
    expect(higher.totalScore).toBeGreaterThan(lower.totalScore)
  })
  it('longterm 인자 증가 -> total 증가', () => {
    const lower = combineAlertScore({ ...base, longterm: { droughtRiskScore: 0.05, floodRiskScore: 0.05, extremeHeatDays: 2 } })
    const higher = combineAlertScore({ ...base, longterm: { droughtRiskScore: 0.95, floodRiskScore: 0.95, extremeHeatDays: 60 } })
    expect(higher.totalScore).toBeGreaterThan(lower.totalScore)
  })
  it('생육단계에 따라 동일 인자라도 total이 달라짐(가중치 배수 적용 확인)', () => {
    const early = combineAlertScore({ ...base, growthStage: '초기' })
    const harvest = combineAlertScore({ ...base, growthStage: '수확기' })
    expect(early.totalScore).not.toBe(harvest.totalScore)
  })
  it('totalScore는 0~100 범위(클램프 확인)', () => {
    const maxed = combineAlertScore({
      weather: { tempC: 40, humidityPct: 100, precipMm: 200 },
      pest: { riskLevel: '높음' },
      longterm: { droughtRiskScore: 1, floodRiskScore: 1, extremeHeatDays: 200 },
      region: '해남군',
      crop: '배추',
      growthStage: '수확기',
    })
    expect(maxed.totalScore).toBeLessThanOrEqual(100)
  })
  it('결정적 — 동일 입력은 동일 출력', () => {
    expect(combineAlertScore(base)).toEqual(combineAlertScore(base))
  })
})

describe('생육단계 가중치 배수 config', () => {
  it('초기/수확기는 병해충·기상 가중치가 서로 다름', () => {
    expect(GROWTH_STAGE_WEIGHTS.초기.pest).not.toBe(GROWTH_STAGE_WEIGHTS.수확기.pest)
    expect(GROWTH_STAGE_WEIGHTS.초기.weather).not.toBe(GROWTH_STAGE_WEIGHTS.수확기.weather)
  })
})

describe('alertTierOf', () => {
  it('경계값: 40 미만 정상, 40~69 주의, 70 이상 경보', () => {
    expect(alertTierOf(39)).toBe('정상')
    expect(alertTierOf(40)).toBe('주의')
    expect(alertTierOf(69)).toBe('주의')
    expect(alertTierOf(70)).toBe('경보')
  })
})

describe('branchAlert — 3개 분기가 서로 다른 조건에서 발동', () => {
  it('기상 단독 경보(병충해 낮음): 즉시알림만 발동, 방제안내/추천트리거는 안 뜸', () => {
    const b = branchAlert(85, 0.2) // totalScore 경보, pestScore 낮음
    expect(b.immediateAlert).toBe(true)
    expect(b.controlGuidance).toBe(false)
    expect(b.recommendTrigger).toBe(false)
  })
  it('병충해만 높고 전체는 주의 단계: 방제안내만 발동', () => {
    const b = branchAlert(50, 0.7) // totalScore 주의, pestScore 높음
    expect(b.immediateAlert).toBe(false)
    expect(b.controlGuidance).toBe(true)
    expect(b.recommendTrigger).toBe(false)
  })
  it('병충해가 원인이 되어 경보까지 도달: 3개 모두 발동', () => {
    const b = branchAlert(85, 0.7)
    expect(b.immediateAlert).toBe(true)
    expect(b.controlGuidance).toBe(true)
    expect(b.recommendTrigger).toBe(true)
  })
  it('둘 다 낮으면 아무것도 발동하지 않음', () => {
    const b = branchAlert(20, 0.1)
    expect(b.immediateAlert).toBe(false)
    expect(b.controlGuidance).toBe(false)
    expect(b.recommendTrigger).toBe(false)
  })
})

describe('generateAdvisories', () => {
  const baseScore: AlertScoreResult = {
    weatherScore: 0.1,
    pestScore: 0.1,
    longtermScore: 0.1,
    totalScore: 15,
    growthStage: '생육기',
  }

  it('전부 낮으면 중립 문구 하나씩만 반환', () => {
    const a = generateAdvisories(baseScore)
    expect(a.recommendations).toHaveLength(1)
    expect(a.precautions).toHaveLength(1)
    expect(a.precautions[0]).toContain('뚜렷한 주의사항이 없습니다')
  })

  it('기상 점수 높으면 기상 관련 주의점+권장사항 추가', () => {
    const a = generateAdvisories({ ...baseScore, weatherScore: 0.8 })
    expect(a.precautions.some((p) => p.includes('기상 위험'))).toBe(true)
    expect(a.recommendations.some((r) => r.includes('한랭사'))).toBe(true)
  })

  it('병충해 점수 높으면 병충해 관련 주의점+권장사항 추가', () => {
    const a = generateAdvisories({ ...baseScore, pestScore: 0.8 })
    expect(a.precautions.some((p) => p.includes('병충해 위험'))).toBe(true)
    expect(a.recommendations.some((r) => r.includes('공동 방제'))).toBe(true)
  })

  it('장기기후 점수 높으면 가뭄/홍수 주의점 추가', () => {
    const a = generateAdvisories({ ...baseScore, longtermScore: 0.8 })
    expect(a.precautions.some((p) => p.includes('가뭄·홍수'))).toBe(true)
  })

  it('생육단계 초기이면 서리 대비 권장사항', () => {
    const a = generateAdvisories({ ...baseScore, growthStage: '초기' })
    expect(a.recommendations.some((r) => r.includes('서리'))).toBe(true)
  })

  it('생육단계 수확기이면 품질저하 예방 주의점', () => {
    const a = generateAdvisories({ ...baseScore, growthStage: '수확기' })
    expect(a.precautions.some((p) => p.includes('수확기'))).toBe(true)
  })

  it('결정적 — 동일 입력은 동일 출력', () => {
    const a = generateAdvisories({ ...baseScore, weatherScore: 0.8, pestScore: 0.6 })
    const b = generateAdvisories({ ...baseScore, weatherScore: 0.8, pestScore: 0.6 })
    expect(a).toEqual(b)
  })
})

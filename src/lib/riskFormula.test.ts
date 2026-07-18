import { describe, it, expect } from 'vitest'
import { computeRiskTier, tierOf } from './riskFormula.ts'

describe('tierOf — 경계값 (>기준)', () => {
  it('정확히 10/20/30%는 낮은 단계로 귀속', () => {
    expect(tierOf(10)).toBe('정상')
    expect(tierOf(20)).toBe('관심')
    expect(tierOf(30)).toBe('주의')
  })
  it('경계값 바로 위는 상위 단계', () => {
    expect(tierOf(10.1)).toBe('관심')
    expect(tierOf(20.1)).toBe('주의')
    expect(tierOf(30.1)).toBe('경계')
  })
  it('음수 편차도 절댓값 기준 동일', () => {
    expect(tierOf(-9.9)).toBe('정상')
    expect(tierOf(-15)).toBe('관심')
    expect(tierOf(-25)).toBe('주의')
    expect(tierOf(-40)).toBe('경계')
  })
})

describe('computeRiskTier', () => {
  it('과잉(+) 방향 및 편차% 계산', () => {
    const r = computeRiskTier(1300, 1000)
    expect(r.deviationPct).toBe(30)
    expect(r.direction).toBe('+')
    expect(r.tier).toBe('주의') // 정확히 30 -> 주의
    expect(r.over).toBe(true)
  })
  it('부족(-) 방향', () => {
    const r = computeRiskTier(650, 1000)
    expect(r.deviationPct).toBe(-35)
    expect(r.direction).toBe('-')
    expect(r.tier).toBe('경계')
  })
  it('평년과 동일하면 정상/과잉0', () => {
    const r = computeRiskTier(1000, 1000)
    expect(r.deviationPct).toBe(0)
    expect(r.tier).toBe('정상')
  })
  it('baseline 0이면 안전 처리', () => {
    const r = computeRiskTier(500, 0)
    expect(r.deviationPct).toBe(0)
    expect(r.tier).toBe('정상')
  })
  it('경계 초과(+31%)는 경계', () => {
    expect(computeRiskTier(1310, 1000).tier).toBe('경계')
  })
})

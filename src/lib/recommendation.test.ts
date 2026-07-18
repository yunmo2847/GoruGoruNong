import { describe, it, expect } from 'vitest'
import { scoreCandidates, combineScore, resolveSuitabilityProvider, WEIGHTS, type RecoContext, type Factors } from './recommendation.ts'

const ctx: RecoContext = {
  baseline: { '해남군|양파': 2000, '해남군|대파': 1000 },
  registered: { '해남군|양파': 500 },
}

describe('scoreCandidates', () => {
  it('원작물을 제외한다', () => {
    const list = scoreCandidates('해남군', '배추', ctx)
    expect(list.find((c) => c.crop === '배추')).toBeUndefined()
  })
  it('per-factor breakdown + total 점수를 반환', () => {
    const list = scoreCandidates('해남군', '배추', ctx)
    expect(list.length).toBeGreaterThan(0)
    for (const c of list) {
      expect(c.factors).toHaveProperty('profitability')
      expect(c.factors).toHaveProperty('climate')
      expect(c.factors).toHaveProperty('headroom')
      expect(c.factors).toHaveProperty('ease')
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(100)
    }
  })
  it('결정적 정렬 — 동일 입력은 동일 순서', () => {
    const a = scoreCandidates('해남군', '배추', ctx).map((c) => c.crop)
    const b = scoreCandidates('해남군', '배추', ctx).map((c) => c.crop)
    expect(a).toEqual(b)
  })
  it('내림차순 정렬 보장', () => {
    const list = scoreCandidates('해남군', '배추', ctx)
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].score).toBeGreaterThanOrEqual(list[i].score)
    }
  })
})

describe('combineScore — factor별 monotonicity', () => {
  const base: Factors = { profitability: 0.5, climate: 0.5, headroom: 0.5, ease: 0.5 }
  const factorKeys = Object.keys(base) as (keyof Factors)[]
  for (const k of factorKeys) {
    it(`${k} 증가 -> total 증가`, () => {
      const lower = combineScore({ ...base, [k]: 0.2 })
      const higher = combineScore({ ...base, [k]: 0.8 })
      expect(higher).toBeGreaterThan(lower)
    })
  }
  it('가중치 합은 1', () => {
    const sum = WEIGHTS.profitability + WEIGHTS.climate + WEIGHTS.headroom + WEIGHTS.ease
    expect(sum).toBeCloseTo(1, 5)
  })
})

describe('resolveSuitabilityProvider — 자동 폴백', () => {
  it('real 어댑터 실패 시 static 값으로 폴백(throw 없음)', () => {
    const p = resolveSuitabilityProvider(true)
    expect(() => p.getSuitability('해남군', '양파')).not.toThrow()
    const v = p.getSuitability('해남군', '양파')
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(1)
  })
})

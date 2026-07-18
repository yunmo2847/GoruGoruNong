// demoScenario 회귀 테스트 — 데모 시나리오 조합이 항상 tier='경계'(+방향)를 내는지 잠근다.
// seed 스크립트가 만든 baseline.json 과 plans 저장소의 시드 비율(1.46)을 함께 검증한다.
import { describe, it, expect } from 'vitest'
import { computeRiskTier } from './riskFormula.ts'
import baselineFile from '../data/baseline.json'

const SEED_RATIO = 1.46 // server/store/plans.ts 의 demoScenario 시드 비율과 일치해야 함

describe('demoScenario 회귀 잠금', () => {
  const demo = baselineFile.demoScenario
  const row = (baselineFile.rows as Array<{ region: string; crop: string; baselineHa: number; isDemoScenario: boolean }>).find(
    (r) => r.isDemoScenario,
  )

  it('baseline.json 에 demoScenario 행이 존재하고 메타와 일치', () => {
    expect(row).toBeDefined()
    expect(row!.region).toBe(demo.region)
    expect(row!.crop).toBe(demo.crop)
    expect(row!.baselineHa).toBeGreaterThan(0)
  })

  it('시드 등록면적(baseline×1.46)은 항상 경계 + 과잉(+)', () => {
    const registered = Math.round(row!.baselineHa * SEED_RATIO)
    const risk = computeRiskTier(registered, row!.baselineHa)
    expect(risk.tier).toBe('경계')
    expect(risk.direction).toBe('+')
    expect(risk.deviationPct).toBeGreaterThan(30)
  })
})

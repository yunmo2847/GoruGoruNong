import { describe, it, expect } from 'vitest'
import { buildNationwideComparison, type PlanLike, type BaselineLike } from './nationwideComparison.ts'

const baseline: BaselineLike[] = [
  { region: '해남군', crop: '배추', baselineHa: 2000 },
  { region: '무안군', crop: '양파', baselineHa: 1000 },
  { region: '평창군', crop: '배추', baselineHa: 800 },
]

const plans: PlanLike[] = [
  { region: '해남군', province: '전남', crop: '배추', group: '엽채류', area: 2000 }, // 정상
  { region: '해남군', province: '전남', crop: '배추', group: '엽채류', area: 1000 }, // 합산 3000 -> +50% 경계
  { region: '무안군', province: '전남', crop: '양파', group: '양념채소', area: 700 }, // -30% 주의
  { region: '평창군', province: '강원', crop: '배추', group: '엽채류', area: 900 }, // +12.5% 관심
]

describe('buildNationwideComparison', () => {
  const result = buildNationwideComparison(plans, baseline)

  it('시군구×작물로 등록면적을 합산한다', () => {
    const haenamBaechu = result.rows.find((r) => r.region === '해남군' && r.crop === '배추')
    expect(haenamBaechu?.registeredHa).toBe(3000)
    expect(haenamBaechu?.baselineHa).toBe(2000)
    expect(haenamBaechu?.deviationPct).toBe(50)
    expect(haenamBaechu?.tier).toBe('경계')
  })

  it('중복 제거 후 고유 시군구×작물 row 수', () => {
    expect(result.rows.length).toBe(3) // 해남배추(합산), 무안양파, 평창배추
  })

  it('summary 집계가 tier 분포와 일치', () => {
    expect(result.summary.totalRows).toBe(3)
    expect(result.summary.danger).toBe(1) // 해남 배추
    expect(result.summary.caution).toBe(1) // 무안 양파
    expect(result.summary.watch).toBe(1) // 평창 배추
    expect(result.summary.alertCount).toBe(3)
  })

  it('도별 rollup 이 존재하고 편차 절댓값 내림차순', () => {
    expect(result.byProvince.length).toBe(2) // 전남, 강원
    for (let i = 1; i < result.byProvince.length; i++) {
      expect(Math.abs(result.byProvince[i - 1].deviationPct)).toBeGreaterThanOrEqual(
        Math.abs(result.byProvince[i].deviationPct),
      )
    }
  })

  it('작물부류별 rollup 이 존재', () => {
    const yeopchae = result.byGroup.find((g) => g.key === '엽채류')
    expect(yeopchae?.rows).toBe(2) // 해남배추 + 평창배추
  })
})

import { describe, it, expect } from 'vitest'
import { haToPyeong, pyeongToHa, HA_TO_PYEONG } from './units.ts'

describe('units — ha <-> 평 변환', () => {
  it('1ha는 정확히 3025평(1평=400/121㎡ 표준 환산)', () => {
    expect(HA_TO_PYEONG).toBe(3025)
    expect(haToPyeong(1)).toBe(3025)
  })
  it('haToPyeong 정수 반올림', () => {
    expect(haToPyeong(10)).toBe(30250)
    expect(haToPyeong(0)).toBe(0)
  })
  it('pyeongToHa 는 평 기준 무손실 환산', () => {
    expect(pyeongToHa(3025)).toBe(1)
    expect(pyeongToHa(0)).toBe(0)
  })
  it('평 -> ha -> 평 왕복 시 원래 평수를 정확히 복원(입력 평수가 그대로 표시)', () => {
    for (const pyeong of [1, 100, 250, 1000, 3025, 3780, 5000, 12345]) {
      expect(haToPyeong(pyeongToHa(pyeong))).toBe(pyeong)
    }
  })
  it('ha -> 평 -> ha 왕복이 원값에 근접(반올림 오차 허용)', () => {
    const original = 12.5
    const roundTripped = pyeongToHa(haToPyeong(original))
    expect(roundTripped).toBeCloseTo(original, 0)
  })
})

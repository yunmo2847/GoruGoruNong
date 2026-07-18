import { describe, expect, it } from 'vitest'
import { normalizeHeatmap, normalizeMarketStats } from './apiPayload.ts'

describe('API payload 호환성 정규화', () => {
  it('갱신 전 market-stats에도 연도 메타데이터를 채워 Dashboard 크래시를 막는다', () => {
    const result = normalizeMarketStats({
      generatedAt: '2026-07-18T19:24:45.616Z',
      source: 'KAMIS · 평년 2021–2025 · 동결 스냅샷',
      priceTrend: [{
        crop: '배추',
        unit: '원/kg',
        months: [{ month: 1, now: 1000, avg: 900 }],
      }],
      production: [{ crop: '배추', now: 100, avg: 90 }],
    })

    expect(result.priceTrend[0]).toMatchObject({
      year: 2026,
      averageYears: [2021, 2022, 2023, 2024, 2025],
      packageKg: null,
    })
    expect(result.production[0].averageYears).toEqual([2021, 2022, 2023, 2024, 2025])
    expect(result.providers.price).toBe('legacy-snapshot')
  })

  it('명시적으로 빈 평균연도는 그대로 유지하고 잘못된 통계 행은 제외한다', () => {
    const result = normalizeMarketStats({
      priceTrend: [
        { crop: '배추', year: 2026, averageYears: [], months: [{ month: 13, now: 1 }] },
        { crop: '양파', year: 2026, averageYears: [], months: [{ month: 1, now: 800, avg: 700 }] },
      ],
      production: [{ crop: '', now: 'not-a-number' }],
    })

    expect(result.priceTrend).toHaveLength(1)
    expect(result.priceTrend[0].averageYears).toEqual([])
    expect(result.production).toEqual([])
  })

  it('지도 행의 누락된 위험등급을 계산하고 좌표 없는 행을 버린다', () => {
    const result = normalizeHeatmap({ rows: [
      { region: '해남군', province: '전남', crop: '배추', area: 146, baselineHa: 100, lat: 34.573, lng: 126.599 },
      { region: '좌표없음', crop: '배추', area: 10, baselineHa: 10 },
    ] })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ region: '해남군', tier: '경계', direction: '+', over: true })
  })
})

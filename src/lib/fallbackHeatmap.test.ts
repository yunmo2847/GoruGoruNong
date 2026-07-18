import { describe, expect, it } from 'vitest'
import { fallbackHeatmapRows } from './fallbackHeatmap.ts'

describe('지도 데모 분포 폴백', () => {
  it('API가 비어도 지도 행과 해남군×배추 경계 시나리오를 제공한다', () => {
    const rows = fallbackHeatmapRows()
    const demo = rows.find((row) => row.region === '해남군' && row.crop === '배추')
    expect(rows.length).toBeGreaterThan(0)
    expect(demo).toMatchObject({ tier: '경계', direction: '+', over: true })
  })
})

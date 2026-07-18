import { describe, it, expect } from 'vitest'
import { normalizeRegionCode, normalizeCropName, toDailyKey, normalizeBatch, type ExternalRecord } from './normalization.ts'

const regionCodeMap = { 해남군: 'STN175', 무안군: 'STN177' }
const cropAliasMap = { 배추: '배추', 마늘: 'garlic_ncpms' }

describe('normalizeRegionCode', () => {
  it('매핑된 외부코드는 내부 시군구로 변환', () => {
    const r = normalizeRegionCode('STN175', regionCodeMap)
    expect(r?.name).toBe('해남군')
  })
  it('매핑 안 된 코드는 null', () => {
    expect(normalizeRegionCode('UNKNOWN', regionCodeMap)).toBeNull()
  })
})

describe('normalizeCropName', () => {
  it('alias 매치', () => {
    expect(normalizeCropName('garlic_ncpms', cropAliasMap)?.name).toBe('마늘')
  })
  it('직접명 매치(alias 없어도)', () => {
    expect(normalizeCropName('감자', {})?.name).toBe('감자')
  })
  it('매핑 안 되면 null', () => {
    expect(normalizeCropName('없는작물', {})).toBeNull()
  })
})

describe('toDailyKey', () => {
  it('기상청 스타일 YYYYMMDDHHmm 파싱', () => {
    expect(toDailyKey('202607190900')).toBe('2026-07-19')
  })
  it('ISO 문자열 파싱', () => {
    expect(toDailyKey('2026-07-19T12:00:00Z')).toBe('2026-07-19')
  })
  it('epoch ms 파싱', () => {
    const d = new Date('2026-07-19T00:00:00Z')
    expect(toDailyKey(d.getTime())).toBe('2026-07-19')
  })
  it('파싱 불가능하면 null', () => {
    expect(toDailyKey('not-a-date')).toBeNull()
  })
})

describe('normalizeBatch — 매핑 실패 레코드만 스킵', () => {
  const records: ExternalRecord[] = [
    { regionCode: 'STN175', cropExternal: '배추', timestamp: '202607190900', value: 10 }, // 정상
    { regionCode: 'UNKNOWN', timestamp: '202607190900', value: 20 }, // 지역 매핑 실패
    { regionCode: 'STN177', cropExternal: '없는작물', timestamp: '202607190900', value: 30 }, // 작물 매핑 실패
    { regionCode: 'STN175', timestamp: 'garbage-time', value: 40 }, // 시간 파싱 실패
    { regionCode: 'STN177', timestamp: '202607200900', value: 50 }, // 정상(작물 없음)
  ]

  it('매핑 실패 레코드는 스킵되고 나머지는 정상 반환(전체 실패 아님)', () => {
    const result = normalizeBatch(records, regionCodeMap, cropAliasMap)
    expect(result.length).toBe(2) // 1번, 5번만 통과
    expect(result[0].region.name).toBe('해남군')
    expect(result[0].crop?.name).toBe('배추')
    expect(result[0].dayKey).toBe('2026-07-19')
    expect(result[1].region.name).toBe('무안군')
    expect(result[1].crop).toBeNull()
  })
})

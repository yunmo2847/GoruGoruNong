// 기후·병충해 알림용 정규화 레이어 — 4개 외부 소스(APIHUB/AMIS/ARCCAS/NCPMS)의 서로 다른
// 지역코드·작물코드·시간단위를 내부 스키마(sigungu.json/cropSuitability.json, 일 단위)로 통합한다.
// 매핑 실패는 예외가 아니라 "해당 레코드 스킵" — 배치 전체가 하나의 나쁜 레코드 때문에 죽지 않는다.
//
// 현재 상태: scripts/integrations/{apihub,amis,arccas,ncpms}.ts 는 지역 1건 조회(region -> 외부코드
// 역탐색) 방식이라 자체 config 안에서 바로 코드를 매핑하고, 이 배치 정규화 유틸(normalizeBatch 등)은
// server/routes/climate-alert.ts 에서 아직 호출되지 않는다(normalization.test.ts로만 검증됨).
// 여러 지역/작물을 한 번에 반환하는 벌크 엔드포인트로 전환하거나 외부 원시 레코드를 그대로 받아 처리해야
// 할 때 이 레이어를 그 경계에서 사용하면 된다.
import sigunguData from '../data/sigungu.json'
import cropData from '../data/cropSuitability.json'

export interface Region { code: string; name: string; province: string; lat: number; lng: number }
export interface Crop { name: string; group: string; difficulty: number; climateTolerance: number; basePriceKrwPerKg: number; cycleMonths: number }

const regions = sigunguData.regions as Region[]
const regionByName = new Map(regions.map((r) => [r.name, r]))
const crops = cropData.crops as Crop[]
const cropByName = new Map(crops.map((c) => [c.name, c]))

/** 외부 지역코드 -> 내부 시군구. codeMap(우리 시군구명 -> 외부코드)에서 역탐색. 없으면 null. */
export function normalizeRegionCode(externalCode: string, codeMap: Record<string, string>): Region | null {
  for (const [ourName, code] of Object.entries(codeMap)) {
    if (code && code === externalCode) return regionByName.get(ourName) ?? null
  }
  return null
}

/** 외부 작물 표기 -> 내부 작물. aliasMap(우리 작물명 -> 외부표기) 우선, 그다음 직접명 매치. 없으면 null. */
export function normalizeCropName(external: string, aliasMap: Record<string, string> = {}): Crop | null {
  for (const [ourName, alias] of Object.entries(aliasMap)) {
    if (alias && (external === alias || external.includes(alias))) return cropByName.get(ourName) ?? null
  }
  return cropByName.get(external) ?? null
}

/**
 * 임의 타임스탬프 표현(ISO 문자열/기상청 YYYYMMDDHHmm/epoch ms)을 'YYYY-MM-DD' 일 단위로 통일.
 * 실시간(APIHUB)·일별 예찰(NCPMS)·장기 시나리오(ARCCAS)를 같은 일 단위 키로 묶기 위함.
 * 파싱 불가능하면 null(호출자가 해당 레코드를 스킵하도록).
 */
export function toDailyKey(input: string | number | Date): string | null {
  if (typeof input === 'string' && /^\d{12}$/.test(input)) {
    // 기상청 스타일 YYYYMMDDHHmm — 이미 달력 날짜 그대로이므로 Date 변환(타임존 이동) 없이 직접 추출.
    const y = input.slice(0, 4)
    const mo = input.slice(4, 6)
    const da = input.slice(6, 8)
    return `${y}-${mo}-${da}`
  }
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export interface ExternalRecord {
  regionCode: string
  cropExternal?: string
  timestamp: string | number
  value: number
}

export interface NormalizedRecord {
  region: Region
  crop: Crop | null
  dayKey: string
  value: number
}

/**
 * 외부 레코드 배치를 내부 스키마로 정규화. 지역/작물/시간 중 하나라도 매핑 실패하면
 * 그 레코드만 조용히 스킵하고 나머지는 계속 처리한다(전체 실패 아님).
 */
export function normalizeBatch(
  records: ExternalRecord[],
  regionCodeMap: Record<string, string>,
  cropAliasMap: Record<string, string> = {},
): NormalizedRecord[] {
  const out: NormalizedRecord[] = []
  for (const r of records) {
    const region = normalizeRegionCode(r.regionCode, regionCodeMap)
    if (!region) continue

    let crop: Crop | null = null
    if (r.cropExternal) {
      crop = normalizeCropName(r.cropExternal, cropAliasMap)
      if (!crop) continue
    }

    const dayKey = toDailyKey(r.timestamp)
    if (!dayKey) continue

    out.push({ region, crop, dayKey, value: r.value })
  }
  return out
}

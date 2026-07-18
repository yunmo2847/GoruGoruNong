// 공공데이터포털(data.go.kr) — 한국농수산식품유통공사(aT) '일별 도,소매 가격정보 조회' 클라이언트.
// KAMIS 직접 API 대신 data.go.kr serviceKey 방식으로 동일한 aT 가격 데이터를 받는다.
// 품목코드 체계는 KAMIS 와 동일하므로 integration-codes.json 의 kamis.items 를 재사용한다.
//
// 정확한 요청주소/파라미터명은 승인 후 data.go.kr '활용신청 상세'의 요청주소로 확정된다.
// -> integration-codes.json 의 atDataGo.baseUrl / params 를 그 값으로 채우면 된다.
// 응답은 data.go.kr 표준 래퍼(response.body.items.item[]) 또는 odcloud(data[])를 모두 방어적으로 파싱한다.
import { fetchJson } from './http.ts'
import type { KamisItem } from './kamis.ts'

export interface AtConfig {
  baseUrl: string
  productClsCode: string
  numOfRows: number
  params: {
    serviceKey: string
    returnType: string
    returnTypeValue: string
    numOfRows: string
    pageNo: string
    regday: string
    productClsCode: string
    itemCategoryCode: string
    itemCode: string
    kindCode: string
  }
  items: Record<string, KamisItem>
}

export interface AtPricePoint {
  month: number
  price: number // 조사일 kg환산가격
}

/** 특정 작물의 지정 연도 대표일(매월 15일) kg환산 도매가를 월별로 반환. 실패/미설정 시 null. */
export async function fetchAtMonthlyPrice(
  crop: string,
  year: number,
  cfg: AtConfig,
  serviceKey: string,
): Promise<AtPricePoint[] | null> {
  if (!cfg.baseUrl) return null // 요청주소 미설정 -> 폴백
  const item = cfg.items[crop]
  if (!item || !item.itemCode) return null

  const points: AtPricePoint[] = []
  for (let month = 1; month <= 12; month++) {
    const day = `${year}-${String(month).padStart(2, '0')}-15`
    const p = cfg.params
    const qs = new URLSearchParams()
    qs.set(p.serviceKey, serviceKey)
    if (p.returnType) qs.set(p.returnType, p.returnTypeValue || 'json')
    qs.set(p.numOfRows, String(cfg.numOfRows))
    qs.set(p.pageNo, '1')
    qs.set(p.regday, day)
    qs.set(p.productClsCode, cfg.productClsCode)
    qs.set(p.itemCategoryCode, item.categoryCode)
    qs.set(p.itemCode, item.itemCode)
    if (item.kindCode) qs.set(p.kindCode, item.kindCode)

    try {
      const raw = await fetchJson<AtResponse>(`${cfg.baseUrl}?${qs.toString()}`)
      const rows = extractRows(raw)
      const prices = rows.map(kgPriceOf).filter((v): v is number => v != null)
      if (prices.length) points.push({ month, price: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) })
    } catch {
      continue // 해당 월 실패는 건너뜀(부분 성공 허용)
    }
  }
  return points.length ? points : null
}

// data.go.kr 응답은 스키마/키 케이싱이 제각각 -> 방어적 파싱.
type AtRow = Record<string, unknown>
interface AtResponse {
  response?: { body?: { items?: { item?: AtRow[] } | AtRow[] } }
  data?: AtRow[]
  items?: AtRow[]
}

function extractRows(raw: AtResponse): AtRow[] {
  const body = raw?.response?.body
  const items = body?.items
  if (Array.isArray(items)) return items
  if (items && Array.isArray((items as { item?: AtRow[] }).item)) return (items as { item: AtRow[] }).item
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

// 조사일 kg환산가격 후보 키(케이싱/이름 변형 대응)
const KG_PRICE_KEYS = ['kgUnitPrice', 'unitPrice', 'kgConvertPrice', 'convertPrice', 'price', 'dpr1']

function kgPriceOf(row: AtRow): number | null {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase()
    if (lower.includes('kg') && (lower.includes('price') || lower.includes('가격'))) {
      const n = toNum(row[key])
      if (n != null) return n
    }
  }
  for (const k of KG_PRICE_KEYS) {
    if (k in row) {
      const n = toNum(row[k])
      if (n != null) return n
    }
  }
  return null
}

function toNum(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/[,\s원]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

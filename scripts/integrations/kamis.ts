// KAMIS Open-API 클라이언트 — 품목별 기간 도매가격 조회.
// 엔드포인트/파라미터는 확인된 스펙 기준:
//   http://www.kamis.or.kr/service/price/xml.do?action=periodProductList
//   &p_cert_key=&p_cert_id=&p_returntype=json&p_productclscode=01
//   &p_itemcategorycode=&p_itemcode=&p_kindcode=&p_startday=&p_endday=&p_convert_kg_yn=Y
// 품목코드는 src/data/integration-codes.json 에서 주입(포털 코드표로 검증 필요).
import { fetchJson } from './http.ts'

export interface KamisItem {
  categoryCode: string
  itemCode: string
  kindCode?: string
}
export interface KamisConfig {
  baseUrl: string
  action: string
  productClsCode: string
  items: Record<string, KamisItem>
}
export interface KamisCreds {
  certKey: string
  certId: string
}

/** 월별 평균 도매가(원/kg) 시계열을 반환. 실패/빈응답 시 null. */
export async function fetchKamisMonthlyPrice(
  crop: string,
  year: number,
  cfg: KamisConfig,
  creds: KamisCreds,
): Promise<{ month: number; price: number }[] | null> {
  const item = cfg.items[crop]
  if (!item || !item.itemCode) return null // 코드 미설정 -> 폴백

  const params = new URLSearchParams({
    action: cfg.action,
    p_cert_key: creds.certKey,
    p_cert_id: creds.certId,
    p_returntype: 'json',
    p_productclscode: cfg.productClsCode,
    p_itemcategorycode: item.categoryCode,
    p_itemcode: item.itemCode,
    p_kindcode: item.kindCode ?? '',
    p_startday: `${year}-01-01`,
    p_endday: `${year}-12-31`,
    p_convert_kg_yn: 'Y',
  })

  const url = `${cfg.baseUrl}?${params.toString()}`
  const raw = await fetchJson<KamisResponse>(url)

  const rows = extractRows(raw)
  if (!rows.length) return null

  // 일자 문자열에서 월 추출 -> 월별 평균
  const byMonth = new Map<number, number[]>()
  for (const r of rows) {
    const m = parseMonth(r.regday ?? r.yyyy ?? '')
    const price = parsePrice(r.price ?? r.dpr1 ?? '')
    if (m && price != null) {
      if (!byMonth.has(m)) byMonth.set(m, [])
      byMonth.get(m)!.push(price)
    }
  }
  if (byMonth.size === 0) return null
  return [...byMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, arr]) => ({ month, price: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) }))
}

// KAMIS 응답은 스키마가 액션마다 달라 방어적으로 파싱.
interface KamisRow { regday?: string; yyyy?: string; price?: string; dpr1?: string }
interface KamisResponse { data?: { item?: KamisRow[] } | KamisRow[]; price?: KamisRow[]; item?: KamisRow[] }

function extractRows(raw: KamisResponse): KamisRow[] {
  if (Array.isArray(raw?.data)) return raw.data as KamisRow[]
  const d = raw?.data as { item?: KamisRow[] } | undefined
  if (Array.isArray(d?.item)) return d!.item!
  if (Array.isArray(raw?.item)) return raw.item!
  if (Array.isArray(raw?.price)) return raw.price!
  return []
}

function parseMonth(s: string): number | null {
  const m = s.match(/(\d{4})[-/.]?(\d{1,2})/)
  if (m) return Number(m[2])
  return null
}
function parsePrice(s: string): number | null {
  const n = Number(String(s).replace(/[,\s원]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

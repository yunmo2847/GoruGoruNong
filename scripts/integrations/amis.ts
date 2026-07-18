// 농촌진흥청 국립농업과학원 농업기상 관측데이터(공공데이터포털, data.go.kr) 클라이언트.
// data.go.kr serviceKey 방식 — atDataGo.ts 와 동일한 표준 응답 래퍼(response.body.items.item[])를 따른다.
// 정확한 요청주소/파라미터명은 승인 후 '활용신청 상세'에서 확정 -> integration-codes.json 의
// amis.baseUrl/params 에 채운다(비어있으면 폴백).
import { fetchJson } from './http.ts'

export interface AmisConfig {
  baseUrl: string
  numOfRows: number
  params: {
    serviceKey: string
    returnType: string
    returnTypeValue: string
    numOfRows: string
    pageNo: string
    obsDate: string // 관측일자 파라미터명
    stnCode: string // 관측지점코드 파라미터명
  }
  stationCodes: Record<string, string> // 우리 시군구명 -> 농업기상 관측지점코드
}

export interface AmisObservation {
  region: string
  tempC: number | null
  humidityPct: number | null
  windSpeedMs: number | null
  solarRadiation: number | null
}

/** 시군구의 농업기상 관측값. baseUrl/지점코드 미설정 또는 호출 실패 시 null(폴백). */
export async function fetchAmisObservation(region: string, cfg: AmisConfig, serviceKey: string): Promise<AmisObservation | null> {
  if (!cfg.baseUrl) return null
  const stn = cfg.stationCodes[region]
  if (!stn) return null

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const p = cfg.params
  const qs = new URLSearchParams()
  qs.set(p.serviceKey, serviceKey)
  if (p.returnType) qs.set(p.returnType, p.returnTypeValue || 'json')
  qs.set(p.numOfRows, String(cfg.numOfRows))
  qs.set(p.pageNo, '1')
  qs.set(p.obsDate, today)
  qs.set(p.stnCode, stn)

  try {
    const raw = await fetchJson<AmisResponse>(`${cfg.baseUrl}?${qs.toString()}`)
    const rows = extractRows(raw)
    if (!rows.length) return null
    const row = rows[0]
    return {
      region,
      tempC: toNum(row.temp ?? row.ta),
      humidityPct: toNum(row.humidity ?? row.hm),
      windSpeedMs: toNum(row.windSpeed ?? row.ws),
      solarRadiation: toNum(row.solarRadiation ?? row.solar),
    }
  } catch {
    return null
  }
}

type AmisRow = { temp?: unknown; ta?: unknown; humidity?: unknown; hm?: unknown; windSpeed?: unknown; ws?: unknown; solarRadiation?: unknown; solar?: unknown }
interface AmisResponse {
  response?: { body?: { items?: { item?: AmisRow[] } | AmisRow[] } }
  data?: AmisRow[]
}

function extractRows(raw: AmisResponse): AmisRow[] {
  const items = raw?.response?.body?.items
  if (Array.isArray(items)) return items
  if (items && Array.isArray((items as { item?: AmisRow[] }).item)) return (items as { item: AmisRow[] }).item
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function toNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

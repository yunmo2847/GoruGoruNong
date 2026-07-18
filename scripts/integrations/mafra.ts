// 농림축산식품 공공데이터 포털(data.mafra.go.kr / EPIS OASIS) 클라이언트.
// OASIS 오픈API 는 경로에 인증키를 넣는 형식이 표준:
//   http://{host}/openapi/{KEY}/json/{서비스명}/{start}/{end}?optionalParam=value
// 우리 앱에서 MAFRA 는 '생산량'(대시보드 생산량 vs 평년값 차트)의 실소스로 쓴다.
// 서비스명/응답 필드명은 승인 후 포털의 서비스 상세에서 확정 -> integration-codes.json 에 채운다.
import { fetchJson } from './http.ts'

export interface MafraConfig {
  urlTemplate: string // 예: "http://211.237.50.150:7080/openapi/{KEY}/json/{SERVICE}/{START}/{END}"
  service: string
  pageSize: number
  cropField: string // 응답에서 작물명이 담긴 필드
  productionField: string // 생산량(톤/천톤) 필드
  yearField: string // 연도 필드
  cropAliases: Record<string, string> // 우리 작물명 -> MAFRA 표기(다르면)
}

export interface MafraProduction {
  crop: string
  nowKtons: number
  avgKtons: number
}

type MafraRow = Record<string, unknown>

/** 작물별 생산량(금년/평년) 을 반환. 미설정/실패 시 null(폴백). */
export async function fetchMafraProduction(cfg: MafraConfig, apiKey: string): Promise<MafraProduction[] | null> {
  if (!cfg.urlTemplate || !cfg.service) return null

  const url = cfg.urlTemplate
    .replace('{KEY}', apiKey)
    .replace('{SERVICE}', cfg.service)
    .replace('{START}', '1')
    .replace('{END}', String(cfg.pageSize))

  let raw: MafraResponse
  try {
    raw = await fetchJson<MafraResponse>(url)
  } catch {
    return null
  }

  const rows = extractRows(raw, cfg.service)
  if (!rows.length) return null

  // 작물별로 연도 그룹핑 -> 최신연도=금년, 나머지 평균=평년
  const byCrop = new Map<string, { year: number; ktons: number }[]>()
  for (const row of rows) {
    const rawCrop = String(row[cfg.cropField] ?? '').trim()
    if (!rawCrop) continue
    const crop = normalizeCrop(rawCrop, cfg.cropAliases)
    const year = Number(String(row[cfg.yearField] ?? '').match(/\d{4}/)?.[0])
    const ton = toNum(row[cfg.productionField])
    if (!Number.isFinite(year) || ton == null) continue
    if (!byCrop.has(crop)) byCrop.set(crop, [])
    byCrop.get(crop)!.push({ year, ktons: Math.round(ton / 1000) }) // 톤 -> 천톤
  }

  const out: MafraProduction[] = []
  for (const [crop, series] of byCrop) {
    if (!series.length) continue
    series.sort((a, b) => b.year - a.year)
    const now = series[0].ktons
    const rest = series.slice(1)
    const avg = rest.length ? Math.round(rest.reduce((s, v) => s + v.ktons, 0) / rest.length) : now
    out.push({ crop, nowKtons: now, avgKtons: avg })
  }
  return out.length ? out : null
}

interface MafraResponse {
  [service: string]: unknown
  data?: MafraRow[]
}

function extractRows(raw: MafraResponse, service: string): MafraRow[] {
  // OASIS 응답: { <service>: { row: [...] } } 또는 { <service>: [...] }
  const node = raw?.[service] as { row?: MafraRow[] } | MafraRow[] | undefined
  if (Array.isArray(node)) return node
  if (node && Array.isArray(node.row)) return node.row
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function normalizeCrop(raw: string, aliases: Record<string, string>): string {
  for (const [ours, theirs] of Object.entries(aliases)) {
    if (theirs && (raw === theirs || raw.includes(theirs))) return ours
  }
  return raw
}

function toNum(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/[,\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

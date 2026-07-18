// 국가농작물병해충관리시스템(NCPMS) 클라이언트 — 병해충 예찰정보(공공데이터포털, data.go.kr).
// data.go.kr serviceKey 방식(atDataGo.ts/amis.ts와 동일한 표준 응답 래퍼).
// 정확한 요청주소/파라미터명은 승인 후 '활용신청 상세'에서 확정 -> integration-codes.json 의
// ncpms.baseUrl/params 에 채운다(비어있으면 폴백).
import { fetchJson } from './http.ts'

export interface NcpmsConfig {
  baseUrl: string
  numOfRows: number
  params: {
    serviceKey: string
    returnType: string
    returnTypeValue: string
    numOfRows: string
    pageNo: string
    cropName: string // 작물명 파라미터명
  }
  cropAliases: Record<string, string> // 우리 작물명 -> NCPMS 표기(다르면)
}

export interface NcpmsPestAlert {
  crop: string
  pestName: string
  riskLevel: '낮음' | '보통' | '높음'
  occurrenceEnvironment: string
  controlMethod: string
}

/** 작물의 병해충 예찰정보(최근 발생 위험 상위 1건). baseUrl 미설정 또는 호출 실패 시 null(폴백). */
export async function fetchNcpmsPestAlert(crop: string, cfg: NcpmsConfig, serviceKey: string): Promise<NcpmsPestAlert | null> {
  if (!cfg.baseUrl) return null
  const cropName = cfg.cropAliases[crop] ?? crop

  const p = cfg.params
  const qs = new URLSearchParams()
  qs.set(p.serviceKey, serviceKey)
  if (p.returnType) qs.set(p.returnType, p.returnTypeValue || 'json')
  qs.set(p.numOfRows, String(cfg.numOfRows))
  qs.set(p.pageNo, '1')
  qs.set(p.cropName, cropName)

  try {
    const raw = await fetchJson<NcpmsResponse>(`${cfg.baseUrl}?${qs.toString()}`)
    const rows = extractRows(raw)
    if (!rows.length) return null
    const row = rows[0]
    return {
      crop,
      pestName: String(row.pestName ?? row.sickNm ?? '알 수 없음'),
      riskLevel: normalizeRisk(row.riskLevel ?? row.grade),
      occurrenceEnvironment: String(row.occurrenceEnvironment ?? row.envr ?? ''),
      controlMethod: String(row.controlMethod ?? row.control ?? ''),
    }
  } catch {
    return null
  }
}

type NcpmsRow = { pestName?: unknown; sickNm?: unknown; riskLevel?: unknown; grade?: unknown; occurrenceEnvironment?: unknown; envr?: unknown; controlMethod?: unknown; control?: unknown }
interface NcpmsResponse {
  response?: { body?: { items?: { item?: NcpmsRow[] } | NcpmsRow[] } }
  data?: NcpmsRow[]
}

function extractRows(raw: NcpmsResponse): NcpmsRow[] {
  const items = raw?.response?.body?.items
  if (Array.isArray(items)) return items
  if (items && Array.isArray((items as { item?: NcpmsRow[] }).item)) return (items as { item: NcpmsRow[] }).item
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function normalizeRisk(v: unknown): NcpmsPestAlert['riskLevel'] {
  const s = String(v ?? '').toLowerCase()
  if (s.includes('높') || s.includes('high') || s === '3') return '높음'
  if (s.includes('낮') || s.includes('low') || s === '1') return '낮음'
  return '보통'
}

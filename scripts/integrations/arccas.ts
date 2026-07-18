// ARCCAS(농업·농촌 기후정보시스템, arccas.or.kr) 클라이언트 — 장기 기후 시나리오(SSP/MME, ~2100년).
// 주의: 리서치 시점 기준 ARCCAS 는 GIS 기반 웹 포털 위주로, 확정된 공개 REST API 스펙을 찾지 못했다.
// (KAMIS/KOSIS/data.go.kr 처럼 표준화된 Open-API 문서가 아직 공개되어 있지 않음 — 이용기관 문의/신청이
// 필요할 수 있음.) 그래서 이 어댑터는 다른 3개와 동일한 "config 비면 폴백" 방어 패턴을 따르되,
// 정확한 엔드포인트가 확인되면 arccas.baseUrl/params 를 채우기만 하면 바로 동작하도록 설계했다.
// ARCCAS 데이터(2100년까지 시나리오)는 자주 바뀌지 않으므로 seed 스크립트에서 동결 스냅샷으로 다룬다.
import { fetchJson } from './http.ts'

export interface ArccasConfig {
  baseUrl: string
  params: {
    apiKey: string
    region: string // 지역 코드 파라미터명
    scenario: string // SSP 시나리오 파라미터명(예: ssp2, ssp5)
  }
  defaultScenario: string
  regionCodes: Record<string, string> // 우리 시군구명 -> ARCCAS 지역코드
}

export interface ArccasProjection {
  region: string
  scenario: string
  droughtRiskScore: number | null // 0~1, 가뭄 위험
  floodRiskScore: number | null // 0~1, 홍수 위험
  extremeHeatDays: number | null // 연간 폭염일수 전망
}

/** 시군구의 장기 기후 시나리오 위험도. baseUrl/지역코드 미설정 또는 호출 실패 시 null(폴백). */
export async function fetchArccasProjection(region: string, cfg: ArccasConfig, apiKey: string): Promise<ArccasProjection | null> {
  if (!cfg.baseUrl) return null
  const code = cfg.regionCodes[region]
  if (!code) return null

  const p = cfg.params
  const qs = new URLSearchParams()
  qs.set(p.apiKey, apiKey)
  qs.set(p.region, code)
  qs.set(p.scenario, cfg.defaultScenario)

  try {
    const raw = await fetchJson<ArccasResponse>(`${cfg.baseUrl}?${qs.toString()}`)
    const row = extractRow(raw)
    if (!row) return null
    return {
      region,
      scenario: cfg.defaultScenario,
      droughtRiskScore: toNum(row.droughtRisk),
      floodRiskScore: toNum(row.floodRisk),
      extremeHeatDays: toNum(row.extremeHeatDays),
    }
  } catch {
    return null
  }
}

interface ArccasRow { droughtRisk?: unknown; floodRisk?: unknown; extremeHeatDays?: unknown }
interface ArccasResponse { data?: ArccasRow | ArccasRow[]; result?: ArccasRow }

function extractRow(raw: ArccasResponse): ArccasRow | null {
  if (Array.isArray(raw?.data)) return raw.data[0] ?? null
  if (raw?.data) return raw.data as ArccasRow
  if (raw?.result) return raw.result
  return null
}

function toNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

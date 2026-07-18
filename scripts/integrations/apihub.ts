// 기상청 API허브(apihub.kma.go.kr) 클라이언트 — 단기 기상 관측(기온/습도/강수량).
// 인증은 URL 쿼리의 authKey 파라미터 방식(회원가입 -> 서비스 신청 -> 마이페이지 인증키 현황에서 확인).
// 실제 관측 엔드포인트는 자료 종류별로 다르므로, 정확한 경로/파라미터는
// src/data/integration-codes.json 의 apihub.baseUrl/params 에서 주입한다(비어있으면 폴백).
import { fetchJson } from './http.ts'

export interface ApihubConfig {
  baseUrl: string // 예: https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php
  params: {
    authKey: string
    tm: string // 관측시각 파라미터명
    stn: string // 관측지점코드 파라미터명
  }
  stationCodes: Record<string, string> // 우리 시군구명 -> 기상청 관측지점코드
}

export interface ApihubObservation {
  region: string
  tempC: number | null
  humidityPct: number | null
  precipMm: number | null
  observedAt: string
}

/** 시군구의 최근 관측값. baseUrl/지점코드 미설정 또는 호출 실패 시 null(폴백). */
export async function fetchApihubObservation(region: string, cfg: ApihubConfig, authKey: string): Promise<ApihubObservation | null> {
  if (!cfg.baseUrl) return null
  const stn = cfg.stationCodes[region]
  if (!stn) return null

  const now = new Date()
  const tm = formatKmaTime(now)
  const p = cfg.params
  const qs = new URLSearchParams()
  qs.set(p.authKey, authKey)
  qs.set(p.tm, tm)
  qs.set(p.stn, stn)

  try {
    const raw = await fetchJson<ApihubRow[] | { data?: ApihubRow[] }>(`${cfg.baseUrl}?${qs.toString()}`)
    const rows = Array.isArray(raw) ? raw : raw?.data ?? []
    if (!rows.length) return null
    const row = rows[0]
    return {
      region,
      tempC: toNum(row.ta ?? row.temp),
      humidityPct: toNum(row.hm ?? row.humidity),
      precipMm: toNum(row.rn ?? row.precip),
      observedAt: tm,
    }
  } catch {
    return null
  }
}

interface ApihubRow { ta?: unknown; temp?: unknown; hm?: unknown; humidity?: unknown; rn?: unknown; precip?: unknown }

function formatKmaTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}00`
}

function toNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// KOSIS Open-API 클라이언트 — 농작물생산조사(재배면적) 시도×작물 조회.
// 엔드포인트/파라미터는 확인된 스펙 기준:
//   https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList
//   &apiKey=&orgId=101&tblId=&itmId=&objL1=&objL2=&format=json&jsonVD=Y&prdSe=Y&newEstPrdCnt=
// tblId / objL 코드 / 지역·작물 분류코드는 src/data/integration-codes.json 에서 주입(포털 메타로 확인).
import { fetchJson } from './http.ts'

export interface KosisConfig {
  baseUrl: string
  orgId: string
  areaTblId: string
  itmIdArea: string
  prdSe: string
  recentYears: number
  provinceObjL: string
  provinceCodes: Record<string, string>
  cropObjL: string
  cropCodes: Record<string, string>
}

export interface ProvinceCropArea {
  province: string
  crop: string
  areaHa: number // 평년(최근 N년 평균) 재배면적
}

interface KosisRow { DT?: string; PRD_DE?: string; C1?: string; C2?: string; ITM_ID?: string }

/** 설정된 모든 시도×작물의 평년 재배면적을 반환. 미설정/실패 시 null(폴백). */
export async function fetchKosisAreas(cfg: KosisConfig, apiKey: string): Promise<ProvinceCropArea[] | null> {
  if (!cfg.areaTblId) return null // 통계표 미설정 -> 폴백

  const out: ProvinceCropArea[] = []
  for (const [province, pCode] of Object.entries(cfg.provinceCodes)) {
    if (!pCode) continue
    for (const [crop, cCode] of Object.entries(cfg.cropCodes)) {
      if (!cCode) continue
      const params = new URLSearchParams({
        method: 'getList',
        apiKey,
        orgId: cfg.orgId,
        tblId: cfg.areaTblId,
        itmId: cfg.itmIdArea,
        [cfg.provinceObjL]: pCode,
        [cfg.cropObjL]: cCode,
        format: 'json',
        jsonVD: 'Y',
        prdSe: cfg.prdSe,
        newEstPrdCnt: String(cfg.recentYears),
      })
      const url = `${cfg.baseUrl}?${params.toString()}`
      try {
        const rows = await fetchJson<KosisRow[]>(url)
        if (!Array.isArray(rows) || rows.length === 0) continue
        const vals = rows.map((r) => Number(r.DT)).filter((v) => Number.isFinite(v) && v > 0)
        if (!vals.length) continue
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length
        out.push({ province, crop, areaHa: Math.round(avg) })
      } catch {
        // 개별 조합 실패는 건너뛰고 계속(부분 성공 허용)
        continue
      }
    }
  }
  return out.length ? out : null
}

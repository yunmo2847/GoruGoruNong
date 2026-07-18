/*
 * seed-climate.ts — ARCCAS 장기 기후 시나리오 동결 스냅샷 생성기
 * ================================================================
 * ARCCAS(농업·농촌 기후정보시스템)는 2100년까지의 SSP 시나리오 데이터로, 자주 바뀌지 않는다.
 * 그래서 APIHUB/AMIS/NCPMS(실시간·주기 갱신)와 달리 seed 시점에 한 번 조회해
 * src/data/climate-longterm.json 으로 동결 스냅샷을 만든다. 런타임(server/routes/climate-alert.ts)은
 * 이 스냅샷만 읽고, ARCCAS를 매 요청마다 호출하지 않는다.
 *
 * ARCCAS_KEY 가 있고 integration-codes.json 의 arccas.baseUrl 이 채워져 있으면 실 API를 시도한다.
 * 없거나 실패하면 — 데모 신뢰성을 위해 — 결정적 폴백 생성기로 대체한다(scripts/integrations/arccas.ts
 * 의 주석대로, 리서치 시점 기준 ARCCAS 공개 REST API 스펙이 확인되지 않았기 때문에 기본 경로가 폴백이다).
 */
import '../server/env.ts'
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { seededUnit } from '../src/lib/deterministic.ts'
import { fetchArccasProjection, type ArccasConfig } from './integrations/arccas.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../src/data')
const offline = process.argv.includes('--offline')

interface Region { code: string; name: string; province: string; lat: number; lng: number }
const regions: Region[] = JSON.parse(readFileSync(resolve(dataDir, 'sigungu.json'), 'utf8')).regions
const codes = JSON.parse(readFileSync(resolve(dataDir, 'integration-codes.json'), 'utf8')) as { arccas: ArccasConfig }

export interface ClimateLongtermRow {
  region: string
  droughtRiskScore: number
  floodRiskScore: number
  extremeHeatDays: number
}

function buildFallbackRow(region: string): ClimateLongtermRow {
  return {
    region,
    droughtRiskScore: Math.round(seededUnit(region + ':drought') * 100) / 100,
    floodRiskScore: Math.round(seededUnit(region + ':flood') * 100) / 100,
    extremeHeatDays: Math.round(seededUnit(region + ':heatdays') * 45), // 0~45일
  }
}

async function main() {
  const arccasKey = process.env.ARCCAS_KEY
  const rows: ClimateLongtermRow[] = []
  let liveCount = 0

  for (const r of regions) {
    let row: ClimateLongtermRow | null = null
    if (!offline && arccasKey) {
      try {
        const live = await fetchArccasProjection(r.name, codes.arccas, arccasKey)
        if (live && live.droughtRiskScore != null && live.floodRiskScore != null && live.extremeHeatDays != null) {
          row = {
            region: r.name,
            droughtRiskScore: live.droughtRiskScore,
            floodRiskScore: live.floodRiskScore,
            extremeHeatDays: live.extremeHeatDays,
          }
          liveCount++
        }
      } catch {
        // 개별 지역 실패는 폴백으로 대체하고 계속
      }
    }
    rows.push(row ?? buildFallbackRow(r.name))
  }

  writeFileSync(
    resolve(dataDir, 'climate-longterm.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: liveCount === rows.length ? 'live' : liveCount > 0 ? 'mixed' : 'offline',
        source:
          liveCount > 0
            ? `ARCCAS 장기 기후 동결 스냅샷 · 실데이터 ${liveCount}/${rows.length}개 지역`
            : '내장 기준값 기반 장기 기후 오프라인 스냅샷 · 외부 API 미사용',
        providers: { longterm: liveCount > 0 ? 'ARCCAS' : 'deterministic-snapshot' },
        scenario: codes.arccas.defaultScenario,
        rows,
      },
      null,
      2,
    ),
  )
  console.log(
    `[seed-climate] mode=${liveCount === rows.length ? 'live' : liveCount > 0 ? 'mixed' : 'offline'}, ` +
      `rows=${rows.length}, live=${liveCount}, fallback=${rows.length - liveCount}`,
  )
}

main()

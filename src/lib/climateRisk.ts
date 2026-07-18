// 기후위험 모의 모듈 — seeded 결정적 mock.
// 동일 시군구×작물 -> 매 호출 동일 값. 추천엔진의 기후적합도 인자로도 재사용된다.

import { seededUnit } from './deterministic.ts'
import cropData from '../data/cropSuitability.json'

const crops = cropData.crops as { name: string; climateTolerance: number }[]

export interface ClimateRisk {
  region: string
  crop: string
  score: number // 0(위험 낮음) ~ 100(위험 높음), 결정적
  label: '낮음' | '보통' | '높음'
  suitability: number // 0~1, 기후적합도(= 1 - 위험 정규화). 추천엔진이 사용.
}

export function computeClimateRisk(region: string, crop: string): ClimateRisk {
  const tolerance = crops.find((c) => c.name === crop)?.climateTolerance ?? 0.5
  // 지역×작물 결정적 노출값(0~1) 을 작물 내성으로 보정
  const exposure = seededUnit(`${region}::${crop}::climate`)
  const raw = exposure * (1 - tolerance) + (1 - tolerance) * 0.15
  const score = Math.round(Math.min(1, Math.max(0, raw)) * 100)
  const label: ClimateRisk['label'] = score >= 60 ? '높음' : score >= 35 ? '보통' : '낮음'
  const suitability = Math.round((1 - score / 100) * 100) / 100
  return { region, crop, score, label, suitability }
}

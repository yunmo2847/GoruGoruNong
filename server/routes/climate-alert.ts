import { Router } from 'express'
import {
  combineAlertScore,
  computeGrowthStage,
  branchAlert,
  generateAdvisories,
  type WeatherInput,
  type PestInput,
  type LongtermInput,
} from '../../src/lib/climateAlert.ts'
import { regionByName, climateLongtermFor, climateSnapshotMeta } from '../data.ts'
import { allPlans } from '../store/plans.ts'

const router = Router()

/** 등록계획 중 해당 시군구×작물의 최신 plant/harvest로 생육단계 계산. 없으면 중립(생육기). */
function growthStageFor(region: string, crop: string) {
  const matches = allPlans()
    .filter((p) => p.region === region && p.crop === crop)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const latest = matches[0]
  return computeGrowthStage(latest?.plant ?? null, latest?.harvest ?? null)
}

// GET /api/climate-alert/:region/:crop — 런타임 외부 호출 없이 스냅샷으로 종합 위험도를 계산한다.
router.get('/:region/:crop', (req, res) => {
  const { region, crop } = req.params
  if (!regionByName.has(region)) {
    return res.status(400).json({ error: 'sigungu.json 에 없는 시군구입니다.' })
  }

  const weather: WeatherInput = { tempC: null, humidityPct: null, precipMm: null }
  const pest: PestInput = { riskLevel: null }
  const longterm: LongtermInput = { droughtRiskScore: null, floodRiskScore: null, extremeHeatDays: null }

  // 기상·병충해는 내장된 결정적 기준값, 장기 기후는 갱신된 동결 스냅샷을 사용한다.
  const longtermSnapshot = climateLongtermFor(region)
  if (longtermSnapshot) {
    longterm.droughtRiskScore = longtermSnapshot.droughtRiskScore
    longterm.floodRiskScore = longtermSnapshot.floodRiskScore
    longterm.extremeHeatDays = longtermSnapshot.extremeHeatDays
  }

  const growthStage = growthStageFor(region, crop)
  const score = combineAlertScore({ weather, pest, longterm, region, crop, growthStage })
  const branch = branchAlert(score.totalScore, score.pestScore)
  const advisory = generateAdvisories(score)

  res.json({ region, crop, ...score, ...branch, ...advisory, snapshot: climateSnapshotMeta })
})

export default router

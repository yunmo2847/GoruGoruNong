import { Router } from 'express'
import { computeRiskTier } from '../../src/lib/riskFormula.ts'
import { baselineFor } from '../data.ts'
import { registeredRecord } from '../store/plans.ts'

const router = Router()

// GET /api/risk?region=&crop=  또는  ?registered=&baseline=
// 편차%, RiskTier, Direction 반환
router.get('/', (req, res) => {
  const { region, crop, registered, baseline } = req.query
  let reg: number
  let base: number
  if (region && crop) {
    const rec = registeredRecord()
    reg = rec[`${region}|${crop}`] ?? 0
    base = baselineFor(String(region), String(crop))
  } else {
    reg = Number(registered)
    base = Number(baseline)
  }
  if (!Number.isFinite(reg) || !Number.isFinite(base)) {
    return res.status(400).json({ error: 'region+crop 또는 registered+baseline 이 필요합니다.' })
  }
  const result = computeRiskTier(reg, base)
  res.json({ region: region ?? null, crop: crop ?? null, registeredHa: reg, baselineHa: base, ...result })
})

export default router

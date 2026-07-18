import { Router } from 'express'
import { buildNationwideComparison } from '../../src/lib/nationwideComparison.ts'
import { allPlans } from '../store/plans.ts'
import { baselineRows } from '../data.ts'

const router = Router()

// GET /api/comparison/nationwide — 모든 등록 시군구×작물 vs 평년값 한 번에 + 도별/작물부류별 rollup
router.get('/nationwide', (_req, res) => {
  const plans = allPlans().map((p) => ({
    region: p.region,
    province: p.province,
    crop: p.crop,
    group: p.group,
    area: p.area,
  }))
  const result = buildNationwideComparison(plans, baselineRows)
  res.json(result)
})

export default router

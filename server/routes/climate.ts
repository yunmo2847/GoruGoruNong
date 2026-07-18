import { Router } from 'express'
import { computeClimateRisk } from '../../src/lib/climateRisk.ts'
import { regionByName } from '../data.ts'

const router = Router()

// GET /api/climate-risk/:region/:crop — 결정적 단일 mock 값(동일 입력 -> 동일 출력)
router.get('/:region/:crop', (req, res) => {
  const { region, crop } = req.params
  if (!regionByName.has(region)) {
    return res.status(400).json({ error: 'sigungu.json 에 없는 시군구입니다.' })
  }
  res.json(computeClimateRisk(region, crop))
})

export default router

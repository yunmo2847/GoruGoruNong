import { Router } from 'express'
import { scoreCandidates, resolveSuitabilityProvider, WEIGHTS } from '../../src/lib/recommendation.ts'
import { baselineRecord, regionByName } from '../data.ts'
import { registeredRecord } from '../store/plans.ts'

const router = Router()

// GET /api/recommendation/:region/:crop — 랭킹된 대체작물 리스트 + per-factor breakdown
// real-API 어댑터 시도 -> static 폴백(자동).
router.get('/:region/:crop', (req, res) => {
  const { region, crop } = req.params
  if (!regionByName.has(region)) {
    return res.status(400).json({ error: 'sigungu.json 에 없는 시군구입니다.' })
  }
  const provider = resolveSuitabilityProvider(true) // real 우선, 실패 시 static 자동 폴백
  const candidates = scoreCandidates(region, crop, {
    baseline: baselineRecord,
    registered: registeredRecord(),
    provider,
  })
  res.json({
    region,
    sourceCrop: crop,
    weights: WEIGHTS,
    providerKind: provider.kind,
    candidates: candidates.slice(0, 8),
  })
})

export default router

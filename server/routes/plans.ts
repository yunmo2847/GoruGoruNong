import { Router } from 'express'
import { addPlan, plansByOwner, heatmapAggregate, deletePlan } from '../store/plans.ts'
import { regionByName, cropByName } from '../data.ts'
import { computeRiskTier } from '../../src/lib/riskFormula.ts'
import { requireAuth, optionalAuth, type AuthedRequest } from '../middleware/requireAuth.ts'

const router = Router()

// POST /api/plans — 인증 필요, 5필드 등록, 시군구 코드 검증, ownerId 기록
router.post('/', requireAuth, (req: AuthedRequest, res) => {
  const { region, crop, area, plant, harvest } = req.body ?? {}
  if (!region || !regionByName.has(region)) {
    return res.status(400).json({ error: 'sigungu.json 에 없는 시군구입니다.' })
  }
  if (!crop || !cropByName.has(crop)) {
    return res.status(400).json({ error: '등록되지 않은 작물입니다.' })
  }
  const areaNum = Number(area)
  if (!Number.isFinite(areaNum) || areaNum <= 0) {
    return res.status(400).json({ error: '0보다 큰 재배면적을 입력하세요.' })
  }
  if (plant && harvest && String(harvest) <= String(plant)) {
    return res.status(400).json({ error: '수확시기는 정식시기 이후여야 합니다.' })
  }
  const plan = addPlan(req.userId!, { region, crop, area: areaNum, plant: plant ?? null, harvest: harvest ?? null })
  res.status(201).json({ plan })
})

// GET /api/plans/mine — 내 재배계획 (인증 필요)
router.get('/mine', requireAuth, (req: AuthedRequest, res) => {
  res.json({ plans: plansByOwner(req.userId!) })
})

// DELETE /api/plans/:id — 본인 소유 재배계획 삭제 (인증 필요)
router.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
  const ok = deletePlan(String(req.params.id), req.userId!)
  if (!ok) return res.status(404).json({ error: '해당 계획을 찾을 수 없거나 삭제 권한이 없습니다.' })
  res.json({ ok: true })
})

// GET /api/map/heatmap — 시군구×작물 등록면적 집계 + tier (읽기 전용, 인증 선택)
router.get('/heatmap', optionalAuth, (_req, res) => {
  const rows = heatmapAggregate().map((r) => {
    const risk = computeRiskTier(r.area, r.baselineHa)
    return { ...r, ...risk }
  })
  res.json({ rows })
})

export default router

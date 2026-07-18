import { Router } from 'express'
import { marketStats } from '../data.ts'

const router = Router()

// GET /api/market-stats — 가격추이 + 생산량 vs 평년값 (동결 스냅샷)
router.get('/', (_req, res) => {
  res.json(marketStats)
})

export default router

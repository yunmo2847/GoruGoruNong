import './env.ts' // .env 를 가장 먼저 로드
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { PORT } from './env.ts'
import { initUsers, DEMO_ACCOUNT } from './store/users.ts'
import { initPlans } from './store/plans.ts'

import authRoutes from './routes/auth.ts'
import planRoutes from './routes/plans.ts'
import riskRoutes from './routes/risk.ts'
import recommendationRoutes from './routes/recommendation.ts'
import marketRoutes from './routes/market.ts'
import climateRoutes from './routes/climate.ts'
import comparisonRoutes from './routes/comparison.ts'
import climateAlertRoutes from './routes/climate-alert.ts'

// ── 저장소 초기화: 데모 계정 시드 -> 그 소유로 초기 계획 시드 ──
const demoUser = initUsers()
initPlans(demoUser.id)

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.use('/api/auth', authRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/map', planRoutes) // GET /api/map/heatmap
app.use('/api/risk', riskRoutes)
app.use('/api/recommendation', recommendationRoutes)
app.use('/api/market-stats', marketRoutes)
app.use('/api/climate-risk', climateRoutes)
app.use('/api/comparison', comparisonRoutes)
app.use('/api/climate-alert', climateAlertRoutes)

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT} · 데모계정 ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`)
})

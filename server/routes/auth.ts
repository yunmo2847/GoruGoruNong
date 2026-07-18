import { Router } from 'express'
import { createUser, findByEmail, findById, verifyPassword, publicUser } from '../store/users.ts'
import { issueToken, clearToken } from '../auth-token.ts'
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.ts'

const router = Router()

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { email, name, password } = req.body ?? {}
  if (!email || !password || !name) return res.status(400).json({ error: '이메일·이름·비밀번호가 필요합니다.' })
  if (String(password).length < 6) return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' })
  if (findByEmail(email)) return res.status(409).json({ error: '이미 가입된 이메일입니다.' })
  const user = createUser(email, name, password)
  issueToken(res, user.id)
  res.status(201).json({ user: publicUser(user) })
})

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const user = email ? findByEmail(email) : undefined
  if (!user || !verifyPassword(user, password ?? '')) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  }
  issueToken(res, user.id)
  res.json({ user: publicUser(user) })
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearToken(res)
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const user = findById(req.userId!)!
  res.json({ user: publicUser(user) })
})

export default router

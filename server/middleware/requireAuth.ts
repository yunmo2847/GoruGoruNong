import type { Request, Response, NextFunction } from 'express'
import { verifyToken, COOKIE_NAME } from '../auth-token.ts'
import { findById } from '../store/users.ts'

// Express Request 확장 (userId 부착)
export interface AuthedRequest extends Request {
  userId?: string
}

/** 로그인 세션이 없으면 401. POST /api/plans 등 개인화 엔드포인트 보호. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME]
  const userId = verifyToken(token)
  if (!userId || !findById(userId)) {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }
  req.userId = userId
  next()
}

/** 인증 선택적 — 있으면 userId 부착, 없어도 통과. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME]
  const userId = verifyToken(token)
  if (userId && findById(userId)) req.userId = userId
  next()
}

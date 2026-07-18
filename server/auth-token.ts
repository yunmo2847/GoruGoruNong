// JWT 발급/검증 + 쿠키 헬퍼. 시크릿은 server 측 env 에만 존재.
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { JWT_SECRET } from './env.ts'

const COOKIE = 'token'
const MAX_AGE_MS = 7 * 24 * 3600 * 1000

export function issueToken(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
  })
}

export function clearToken(res: Response) {
  res.clearCookie(COOKIE)
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    return payload.sub
  } catch {
    return null
  }
}

export const COOKIE_NAME = COOKIE

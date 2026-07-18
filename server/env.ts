// 최소 .env 로더 (외부 의존성 없음). server/ 와 scripts/ 에서만 사용.
// 클라이언트 번들에는 절대 포함되지 않는다(src/ 에서 import 하지 않음).
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

if (existsSync(envPath)) {
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = val
  }
}

export const PORT = Number(process.env.PORT || 5174)
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-local-secret-fallback'

// 타임아웃 지원 fetch 헬퍼 (Node 20+ 전역 fetch 사용). 시드 스크립트 전용.
export async function fetchJson<T = unknown>(url: string, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`JSON 파싱 실패 (${url}) — 응답 앞부분: ${text.slice(0, 120)}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

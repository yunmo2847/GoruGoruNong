// 서버 메모리 TTL 캐시 — 실시간·주기 갱신 외부 소스(APIHUB/AMIS/NCPMS) 호출 결과를 짧게 재사용한다.
// ARCCAS(장기 시나리오)는 여기 대상이 아니다 — scripts/seed-climate.ts 동결 스냅샷으로 별도 처리.
interface Entry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

/** key 에 대해 TTL 내 캐시된 값이 있으면 재사용, 없으면 fetcher 실행 후 캐시. */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) return hit.data as T
  const data = await fetcher()
  store.set(key, { data, expiresAt: now + ttlMs })
  return data
}

export const TTL = {
  WEATHER_MS: 60 * 60 * 1000, // 1시간 — APIHUB/AMIS 실시간 관측
  PEST_MS: 8 * 60 * 60 * 1000, // 8시간 — NCPMS 예찰(주기 갱신, 6~12시간 범위)
} as const

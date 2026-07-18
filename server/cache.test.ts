import { describe, it, expect, vi } from 'vitest'
import { cached } from './cache.ts'

describe('cached — TTL 메모리 캐시', () => {
  it('TTL 내에는 fetcher를 재호출하지 않고 캐시된 값 반환', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1')
    const a = await cached('k1', 10_000, fetcher)
    const b = await cached('k1', 10_000, fetcher)
    expect(a).toBe('v1')
    expect(b).toBe('v1')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('TTL 만료 후에는 fetcher를 다시 호출', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const a = await cached('k2', 1, fetcher) // 1ms TTL
    await new Promise((r) => setTimeout(r, 20))
    const b = await cached('k2', 1, fetcher)
    expect(a).toBe('first')
    expect(b).toBe('second')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('서로 다른 key는 독립적으로 캐시됨', async () => {
    const f1 = vi.fn().mockResolvedValue('a')
    const f2 = vi.fn().mockResolvedValue('b')
    expect(await cached('k3', 10_000, f1)).toBe('a')
    expect(await cached('k4', 10_000, f2)).toBe('b')
    expect(f1).toHaveBeenCalledTimes(1)
    expect(f2).toHaveBeenCalledTimes(1)
  })
})

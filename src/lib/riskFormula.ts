// 위험도 계산 — 순수 함수. 서버/클라이언트/테스트가 공유하는 단일 진실 소스.
// 3단계 임계(plan에서 잠금): |편차| >30% 경계, >20% 주의, >10% 관심, 그 외 정상.

export type Tier = '정상' | '관심' | '주의' | '경계'
export type Direction = '+' | '-'

export interface RiskResult {
  deviationPct: number // 평년 대비 편차 % (부호 포함, 소수 1자리)
  tier: Tier
  direction: Direction // '+' 과잉, '-' 부족
  over: boolean
}

/** 편차%로부터 tier 산출. 경계는 초과(>) 기준: 정확히 10/20/30%는 낮은 단계로 귀속. */
export function tierOf(deviationPct: number): Tier {
  const a = Math.abs(deviationPct)
  if (a > 30) return '경계'
  if (a > 20) return '주의'
  if (a > 10) return '관심'
  return '정상'
}

/** 등록면적 vs 평년값 -> 위험도. baseline<=0이면 편차 0으로 안전 처리. */
export function computeRiskTier(registered: number, baseline: number): RiskResult {
  const dev = baseline > 0 ? ((registered - baseline) / baseline) * 100 : 0
  const rounded = Math.round(dev * 10) / 10
  const over = rounded >= 0
  return {
    deviationPct: rounded,
    tier: tierOf(rounded),
    direction: over ? '+' : '-',
    over,
  }
}

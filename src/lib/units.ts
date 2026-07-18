// 면적 단위 변환 — ha(내부/서버 계산 단위) <-> 평(사용자 표시/입력 단위).
// 서버 스키마·riskFormula·nationwideComparison·demoScenario 회귀는 전부 ha 기준으로 고정되어 있으므로,
// 변환은 오직 이 모듈을 거쳐 표시 레이어와 입력 파싱 경계에서만 이루어진다.
// 1평 = 400/121㎡(한국 표준 환산), 1ha = 10,000㎡ -> 1ha = 10000 × 121/400 = 정확히 3025평.
export const HA_TO_PYEONG = 3025

/** ha -> 평 (정수 반올림, 화면 표시용) */
export function haToPyeong(ha: number): number {
  return Math.round(ha * HA_TO_PYEONG)
}

/**
 * 평 -> ha (서버 전송용).
 * 기준 단위는 "평"이다: 사용자가 입력한 평수를 haToPyeong 으로 되돌렸을 때 원래 정수 평수가
 * 그대로 복원되도록 소수 4자리까지 보존한다(1자리 반올림 시 최대 300평 오차가 났던 버그 수정).
 */
export function pyeongToHa(pyeong: number): number {
  return Math.round((pyeong / HA_TO_PYEONG) * 10000) / 10000
}

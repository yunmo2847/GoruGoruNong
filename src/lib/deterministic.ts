// 결정적(seeded) 유사난수 유틸.
// 동일 입력 문자열 -> 항상 동일한 0~1 값. 시드 스크립트와 기후위험 모의 모듈이 공유한다.

/** FNV-1a 32bit 해시 */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 입력 문자열에 대한 결정적 0~1 값 */
export function seededUnit(input: string): number {
  return hashString(input) / 0xffffffff
}

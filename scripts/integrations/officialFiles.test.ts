import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import XLSX from 'xlsx'
import { loadOfficialFiles } from './officialFiles.ts'

const tempRoots: string[] = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function tempImportDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'official-files-'))
  tempRoots.push(root)
  mkdirSync(join(root, 'kamis'))
  mkdirSync(join(root, 'kosis'))
  return root
}

function writeSheet(path: string, rows: unknown[][], name = 'Sheet1') {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name)
  XLSX.writeFile(workbook, path)
}

describe('공식 XLS 파일 어댑터', () => {
  it('KAMIS 포장가격을 kg당 가격으로 바꾸고 이전 연도 평균을 계산한다', () => {
    const root = tempImportDir()
    writeSheet(join(root, 'kamis', 'kamis-price-cabbage.xls'), [
      ['구분', '1월', '2월'],
      [2026, 10_000, '-'],
      [2025, 8_000, 12_000],
      [2024, 6_000, 10_000],
    ])

    const data = loadOfficialFiles(root)
    expect(data.prices).toEqual([{
      crop: '배추',
      year: 2026,
      averageYears: [2025, 2024],
      packageKg: 10,
      months: [{ month: 1, now: 1_000, avg: 700 }],
    }])
  })

  it('KOSIS 작형별 배추 통계를 앱 품목과 시도명으로 정규화한다', () => {
    const root = tempImportDir()
    writeSheet(join(root, 'kosis', 'leafy.xls'), [
      ['시도별', 2025, 2025],
      ['시도별', '노지가을배추:면적 (ha)', '노지가을배추:생산량 (톤)'],
      ['계', 140, 12_000],
      ['전라남도', 140, 12_000],
    ], '데이터')

    const data = loadOfficialFiles(root)
    expect(data.areas).toContainEqual({ province: '전남', crop: '배추', year: 2025, areaHa: 140 })
    expect(data.production).toContainEqual({ crop: '배추', year: 2025, tons: 12_000 })
  })
})

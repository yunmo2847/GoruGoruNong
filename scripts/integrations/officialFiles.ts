import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const moduleDir = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_OFFICIAL_IMPORT_DIR = resolve(moduleDir, '../../data/import')

type Cell = string | number | null
type Matrix = Cell[][]
type Metric = 'area' | 'production'

export interface OfficialPriceSeries {
  crop: string
  year: number
  averageYears: number[]
  packageKg: number
  months: { month: number; now: number; avg: number }[]
}

export interface OfficialArea {
  province: string
  crop: string
  year: number
  areaHa: number
}

export interface OfficialProduction {
  crop: string
  year: number
  tons: number
}

export interface OfficialFileData {
  prices: OfficialPriceSeries[]
  areas: OfficialArea[]
  production: OfficialProduction[]
  files: { kamis: string[]; kosis: string[] }
}

const KAMIS_PRICE_FILES = [
  { crop: '배추', file: 'kamis-price-cabbage.xls', packageKg: 10 },
  { crop: '양파', file: 'kamis-price-onion.xls', packageKg: 20 },
  { crop: '마늘', file: 'kamis-price-garlic.xls', packageKg: 20 },
  { crop: '감자', file: 'kamis-price-potato.xls', packageKg: 20 },
  { crop: '대파', file: 'kamis-price-green-onion.xls', packageKg: 1 },
  { crop: '고추', file: 'kamis-price-pepper.xls', packageKg: 10 },
] as const

const PROVINCE_ALIASES: Record<string, string> = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원도: '강원',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
  제주도: '제주',
}

// 첫 번째로 값이 존재하는 묶음을 사용한다. 합계 품목이 없을 때만 작형별 값을 더해
// 배추·감자처럼 KOSIS가 세부 작형으로 내보낸 통계를 앱 품목으로 합친다.
const KOSIS_CROP_GROUPS: Record<string, string[][]> = {
  배추: [
    ['배추'],
    ['봄배추', '고랭지배추', '가을배추', '겨울배추'],
    ['노지봄배추', '시설봄배추', '노지고랭지배추', '시설고랭지배추', '노지가을배추', '시설가을배추', '노지겨울배추', '시설겨울배추', '시설배추'],
  ],
  상추: [['상추'], ['노지상추', '시설상추']],
  시금치: [['시금치'], ['노지시금치', '시설시금치']],
  양배추: [['양배추']],
  양파: [['양파']],
  마늘: [['마늘']],
  대파: [['대파'], ['파']],
  고추: [['고추'], ['건고추']],
  생강: [['생강']],
  감자: [['감자'], ['일반봄감자', '고랭지감자', '가을감자']],
  고구마: [['고구마']],
  사과: [['사과']],
  배: [['배']],
  감귤: [['감귤']],
  포도: [['포도']],
  콩: [['콩']],
  쌀: [['쌀'], ['미곡']],
}

function readMatrix(path: string, preferredSheet?: string): Matrix {
  const workbook = XLSX.readFile(path, { cellDates: false })
  const sheetName = preferredSheet && workbook.SheetNames.includes(preferredSheet)
    ? preferredSheet
    : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`${basename(path)}에서 시트를 찾을 수 없습니다.`)
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  }) as Matrix
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const normalized = value.replaceAll(',', '').trim()
  if (!normalized || normalized === '-') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toYear(value: unknown): number | null {
  const parsed = Number(String(value ?? '').trim())
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200 ? parsed : null
}

function readKamisPrice(path: string, crop: string, packageKg: number): OfficialPriceSeries {
  const matrix = readMatrix(path)
  const headerIndex = matrix.findIndex((row) => row.some((cell) => String(cell ?? '').trim() === '1월'))
  if (headerIndex < 0) throw new Error(`${basename(path)}에서 월별 가격 헤더를 찾을 수 없습니다.`)

  const yearly = matrix.slice(headerIndex + 1)
    .map((row) => ({ year: toYear(row[0]), row }))
    .filter((item): item is { year: number; row: Cell[] } => item.year != null)
    .sort((a, b) => b.year - a.year)

  const current = yearly[0]
  if (!current) throw new Error(`${basename(path)}에 연도별 가격이 없습니다.`)
  const history = yearly.slice(1, 6)
  const months: OfficialPriceSeries['months'] = []

  for (let month = 1; month <= 12; month++) {
    const currentPackagePrice = toNumber(current.row[month])
    if (currentPackagePrice == null) continue
    const historicalPackagePrices = history
      .map((item) => toNumber(item.row[month]))
      .filter((value): value is number => value != null)
    const averagePackagePrice = historicalPackagePrices.length
      ? historicalPackagePrices.reduce((sum, value) => sum + value, 0) / historicalPackagePrices.length
      : currentPackagePrice
    months.push({
      month,
      now: Math.round(currentPackagePrice / packageKg),
      avg: Math.round(averagePackagePrice / packageKg),
    })
  }

  if (!months.length) throw new Error(`${basename(path)}에 사용할 수 있는 최신 가격이 없습니다.`)
  return { crop, year: current.year, averageYears: history.map((item) => item.year), packageKg, months }
}

interface RawKosisValue {
  year: number
  region: string
  rawCrop: string
  metric: Metric
  value: number
}

function normalizeKosisRegion(value: unknown): string | null {
  const name = String(value ?? '').trim()
  if (name === '계' || name === '전국') return '전국'
  return PROVINCE_ALIASES[name] ?? null
}

function parseKosisFile(path: string): RawKosisValue[] {
  const matrix = readMatrix(path, '데이터')
  const years = matrix[0] ?? []
  const headers = matrix[1] ?? []
  const columns: { index: number; year: number; rawCrop: string; metric: Metric }[] = []

  for (let index = 1; index < headers.length; index++) {
    const year = toYear(years[index])
    const match = String(headers[index] ?? '').trim().match(/^(.+?):(면적|생산량)\s*\((ha|톤)\)$/)
    if (!year || !match) continue
    columns.push({
      index,
      year,
      rawCrop: match[1].trim(),
      metric: match[2] === '면적' ? 'area' : 'production',
    })
  }

  if (!columns.length) throw new Error(`${basename(path)}에서 KOSIS 면적/생산량 열을 찾을 수 없습니다.`)
  const values: RawKosisValue[] = []
  for (const row of matrix.slice(2)) {
    const region = normalizeKosisRegion(row[0])
    if (!region) continue
    for (const column of columns) {
      const value = toNumber(row[column.index])
      if (value == null) continue
      values.push({ year: column.year, region, rawCrop: column.rawCrop, metric: column.metric, value })
    }
  }
  return values
}

function rawKey(year: number, region: string, rawCrop: string, metric: Metric): string {
  return `${year}|${region}|${rawCrop}|${metric}`
}

function groupedValue(
  values: Map<string, number>,
  year: number,
  region: string,
  metric: Metric,
  groups: string[][],
): number | null {
  for (const group of groups) {
    let found = false
    let sum = 0
    for (const rawCrop of group) {
      const value = values.get(rawKey(year, region, rawCrop, metric))
      if (value == null) continue
      found = true
      sum += value
    }
    if (found) return sum
  }
  return null
}

function listSpreadsheetFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => ['.xls', '.xlsx'].includes(extname(name).toLowerCase()))
    .sort()
    .map((name) => join(dir, name))
}

function readKosisData(paths: string[]): Pick<OfficialFileData, 'areas' | 'production'> {
  const rawValues = paths.flatMap(parseKosisFile)
  const valueMap = new Map<string, number>()
  for (const row of rawValues) valueMap.set(rawKey(row.year, row.region, row.rawCrop, row.metric), row.value)
  const years = [...new Set(rawValues.map((row) => row.year))].sort((a, b) => a - b)
  const provinces = [...new Set(Object.values(PROVINCE_ALIASES))]
  const areas: OfficialArea[] = []
  const production: OfficialProduction[] = []

  for (const [crop, groups] of Object.entries(KOSIS_CROP_GROUPS)) {
    for (const year of years) {
      for (const province of provinces) {
        const areaHa = groupedValue(valueMap, year, province, 'area', groups)
        if (areaHa != null && areaHa > 0) areas.push({ province, crop, year, areaHa })
      }

      let tons = groupedValue(valueMap, year, '전국', 'production', groups)
      if (tons == null) {
        const provinceValues = provinces
          .map((province) => groupedValue(valueMap, year, province, 'production', groups))
          .filter((value): value is number => value != null)
        if (provinceValues.length) tons = provinceValues.reduce((sum, value) => sum + value, 0)
      }
      if (tons != null && tons > 0) production.push({ crop, year, tons })
    }
  }

  return { areas, production }
}

export function loadOfficialFiles(importDir = DEFAULT_OFFICIAL_IMPORT_DIR): OfficialFileData {
  const kamisDir = join(importDir, 'kamis')
  const kosisDir = join(importDir, 'kosis')
  const prices: OfficialPriceSeries[] = []
  const kamisFiles: string[] = []

  for (const config of KAMIS_PRICE_FILES) {
    const path = join(kamisDir, config.file)
    if (!existsSync(path)) continue
    prices.push(readKamisPrice(path, config.crop, config.packageKg))
    kamisFiles.push(config.file)
  }

  const kosisPaths = listSpreadsheetFiles(kosisDir)
  const kosis = readKosisData(kosisPaths)
  return {
    prices,
    ...kosis,
    files: { kamis: kamisFiles, kosis: kosisPaths.map((path) => basename(path)) },
  }
}

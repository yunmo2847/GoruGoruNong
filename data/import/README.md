# 공식 통계 원본 파일

이 폴더의 XLS/XLSX 원본은 `npm run snapshot:refresh` 실행 시
`src/data/baseline.json`과 `src/data/market-stats.json`으로 변환됩니다.
앱과 서버는 실행 중에 이 파일이나 외부 API를 직접 읽지 않습니다.

## KAMIS 가격 파일

`kamis/` 아래 파일명을 유지한 채 새 파일로 교체합니다.

| 파일 | 품목 | 원자료 포장단위 | 화면 단위 |
|---|---|---:|---:|
| `kamis-price-cabbage.xls` | 배추 | 10kg | 원/kg |
| `kamis-price-onion.xls` | 양파 | 20kg | 원/kg |
| `kamis-price-garlic.xls` | 마늘 | 20kg | 원/kg |
| `kamis-price-potato.xls` | 감자 | 20kg | 원/kg |
| `kamis-price-green-onion.xls` | 대파 | 1kg | 원/kg |
| `kamis-price-pepper.xls` | 고추 | 10kg | 원/kg |

가장 최신 연도를 금년 가격으로 사용하고, 그 이전 최대 5개 연도를 월별로
평균해 비교선으로 사용합니다. 최신 연도의 아직 발표되지 않은 월(`-`)은 차트에서
제외합니다.

## KOSIS 재배면적·생산량 파일

`kosis/`에 농작물생산조사 XLS/XLSX를 넣습니다. 현재 파일명은 다음과 같습니다.

- `kosis-leafy-vegetables.xls`
- `kosis-seasoning-vegetables.xls`
- `kosis-tubers.xls`
- `kosis-beans.xls`
- `kosis-food-crops.xls`
- `kosis-fruit.xls`

KOSIS에서 여러 연도를 함께 내려받으면 최신 연도를 현재값으로, 이전 최대 5개
연도를 평년값으로 자동 계산합니다. 한 연도만 들어 있으면 평년 비교는 화면에서
숨깁니다. 시도 재배면적은 프로젝트의 시군구 목록에 균등 배분한 근사치입니다.

현재 파일에 없는 품목의 재배면적만 기존 결정적 기준값으로 보완됩니다.

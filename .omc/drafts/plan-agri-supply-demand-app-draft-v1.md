# Work Plan (Draft v1): 농산물 수급 불균형 해소 앱

Source spec: `.omc/specs/deep-interview-agri-supply-demand-app.md` (ambiguity 11.8%, PASSED)

## RALPLAN-DR Summary (Short Mode)

### Principles
1. **실데이터, 안전한 전달 방식** — "실연동"의 정신(진짜 정부 데이터)은 지키되, 라이브 데모 중 네트워크/API 장애가 서사를 깨뜨리지 않도록 한다.
2. **파이프라인 우선, 화면 나열 지양** — 등록→히트맵→경보→추천이 하나의 이야기로 흐르게 하고, 나머지(대시보드, 기후위험)는 보조로 취급한다.
3. **범위는 인터뷰에서 이미 잠긴 대로 — 재해석 금지** — 지역커뮤니티 제외, 3단계 임계값(±10/20/30%), 시군구 단위, 5개 필드 등은 이미 확정된 제약이므로 아키텍처 논의에서 재론하지 않는다.
4. **데모 시나리오는 구조적으로 보장** — 특정 작물×지역 조합이 항상 '경계'를 띄우도록 데이터 계층에서 강제한다 (Round 11 결정).
5. **개발 여력에 맞는 최소 백엔드** — 정밀 DB/인증 없이, 정적 스냅샷 + 얇은 API 계층으로 충분하다.

### Decision Drivers (top 3)
1. **데모 신뢰성**: 라이브 API 호출 실패가 심사 중 발생하면 안 됨 → 데이터 스냅샷 방식이 유리.
2. **개발 시간**: 별도 인증/DB 없이 최소 컴포넌트로 6개 확정 기능(5 active) 구현.
3. **스펙 정합성**: 인터뷰에서 정한 시군구 단위, 3단계 임계값, 대체작물 2-path(실API+폴백) 등을 그대로 반영해야 함.

### Viable Options

**Option A — 정적 스냅샷 + 경량 백엔드 (채택)**
- 빌드/시드 단계에서 KAMIS·KOSIS·MAFRA 공공데이터를 1회 fetch해 `src/data/baseline.json`, `src/data/market-stats.json`으로 저장. 런타임에는 이 스냅샷 + 사용자가 등록한 재배계획(인메모리/파일 저장)만 사용.
- Pros: 데모 중 네트워크 의존 없음(안정적), 개발 단순, 실데이터 기반 유지.
- Cons: "실시간성"은 없음 (스냅샷 시점 데이터).

**Option B — 완전 라이브 API 프록시**
- 모든 요청 시 서버가 KAMIS/KOSIS/MAFRA를 실시간 호출.
- Pros: 진짜 실시간.
- Cons: 데모 중 API rate-limit/장애/승인지연 리스크 그대로 노출 — Round 2/3/11에서 이미 사용자가 명시적으로 피하고자 한 리스크와 정면충돌.

**Option C — 완전 정적 목데이터 (API 연동 없음)**
- Pros: 가장 빠른 개발.
- Cons: 인터뷰에서 확정한 "확실한 소스는 실연동" 원칙(Round 3) 위반.

**선택: Option A.** Option B는 사용자가 이미 Round 11에서 명시적으로 배제한 리스크를 재도입하므로 기각. Option C는 Round 3에서 확정한 데이터 정책과 직접 모순되므로 기각.

## Requirements Summary
- Deep-interview 스펙의 5개 active 컴포넌트(등록+지도, 수급경보, 대체작물추천, 통계대시보드, 기후위험) 구현. 지역커뮤니티는 백로그 문서만.
- 기술 스택: 기존 Vite + React 19 + TypeScript 프론트엔드 확장, 경량 Node 백엔드(Express) 신설.

## Acceptance Criteria
(스펙의 Acceptance Criteria 9개를 그대로 상속 — 아래는 구현 관점의 세분화)
- [ ] `POST /api/plans` — 5개 필드(작물/지역/면적/재배유형/시작일) 등록, 시군구 코드 검증
- [ ] `GET /api/map/heatmap` — 시군구×작물 등록면적 합계 반환 (지도 렌더링용)
- [ ] `GET /api/risk` — 시군구×작물 이탈률 계산, RiskTier(관심/주의/경계) + Direction(+/-) 반환, 단위 테스트로 경계값(±10/20/30%) 검증
- [ ] `GET /api/recommendation/:region/:crop` — 실API 시도(설계 인터페이스만, 실제 키 없으면 폴백) → 정적 매핑+KAMIS가격 폴백
- [ ] `GET /api/market-stats` — 가격추이 + 생산량비교 시계열 반환
- [ ] `GET /api/climate-risk/:region/:crop` — 통합 모의값 반환
- [ ] 데모 시나리오 시군구×작물 조합이 seed 데이터에서 항상 '경계' + 방향 표시로 계산됨을 테스트로 고정
- [ ] 프론트: 지도(히트맵), 경보 배지, 추천 카드, 대시보드 차트 2개 렌더링

## Implementation Steps

1. **백엔드 스캐폴딩** — `server/index.ts` (Express), `server/routes/{plans,risk,recommendation,market,climate}.ts`. `package.json`에 `dev:server` 스크립트 추가, 프론트는 Vite proxy로 `/api` 연결 (`vite.config.ts` 수정).
2. **베이스라인 시드 스크립트** — `scripts/seed-baseline.ts`: KAMIS/KOSIS/MAFRA 공공데이터포털 API를 1회 호출해 `src/data/baseline.json`(기준재배면적/평년값, 시군구×작물), `src/data/market-stats.json`(가격·생산량 시계열) 생성. **필수**: 최소 1개 시군구×작물 조합은 실제 이탈률이 ±30% 이상이 되도록 확인/선별하여 `demoScenario` 필드로 표시 (Round 11 결정 반영).
3. **위험도 계산 모듈** — `src/lib/riskFormula.ts`: 순수 함수 `computeRiskTier(registered, baseline): {deviationPct, tier, direction}`. 단위 테스트 `riskFormula.test.ts`로 ±10/20/30% 경계값 검증.
4. **등록 API + 인메모리 저장소** — `server/store/plans.ts` (배열 기반, 데모 규모에 DB 불필요). 시군구 코드 목록은 `src/data/sigungu.json`(공개 GeoJSON 기반)으로 검증.
5. **대체작물 추천 모듈** — `src/lib/recommendation.ts`: interface `SuitabilityProvider`로 실API 어댑터(스텁, 키 없으면 즉시 폴백)와 정적 매핑 어댑터(`src/data/cropSuitability.json` + KAMIS 가격 정렬) 두 구현. 폴백 로직은 어댑터 실패 시 자동 전환.
6. **기후위험 모의 모듈** — `src/lib/climateRisk.ts`: 시군구×작물 시드 기반 결정론적 모의값(같은 입력 → 같은 출력, 데모 재현성 확보). S_weather/pest/longterm 분리 없이 단일 값.
7. **지도 컴포넌트** — `src/components/HeatmapMap.tsx`: 시군구 GeoJSON(공개 데이터, 예: 통계청/행안부 경계 데이터) + leaflet 또는 SVG choropleth. RiskTier 색상 매핑(정상=회색, 관심=연노랑, 주의=주황, 경계=빨강).
8. **등록 폼** — `src/components/PlanForm.tsx`: 5개 필드, 시군구 드롭다운.
9. **경보/추천 패널** — `src/components/RiskAlertPanel.tsx`, `RecommendationCard.tsx`.
10. **통계 대시보드** — `src/components/PriceTrendChart.tsx`, `ProductionComparisonChart.tsx` (2개 지표만, 차트 라이브러리 1개 도입 필요 — recharts 권장, 경량).
11. **라우팅/페이지 조립** — 기존 `src/App.tsx`를 라우터 셸로 교체, `src/pages/{Register,Map,Dashboard}.tsx` 신설.
12. **데모 시나리오 고정 테스트** — `src/lib/riskFormula.test.ts` + e2e 스모크: seed 데이터의 demoScenario 조합이 API 호출 시 항상 '경계'를 반환하는지 검증.

## Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| KAMIS/KOSIS/MAFRA API 키 미승인으로 시드 스크립트 실행 불가 | 시드 스크립트는 실패 시 공개된 표본 데이터(수동 다운로드한 CSV)로 폴백하도록 설계; 최소 1개 데모 시나리오는 수동 검증된 값으로 하드코딩 가능 |
| 시군구 GeoJSON 경계 데이터 라이선스/정확도 문제 | 공개 오픈소스 GeoJSON(예: vuski/admdongkor 등 라이선스 명시된 저장소) 사용, 출처 README에 명기 |
| 대체작물 실API 어댑터가 끝내 미구현 상태로 방치될 위험 | interface 우선 설계로 폴백 경로만으로도 전체 파이프라인이 동작하게 하여, 실API는 스트레치 목표로 분리 |

## Verification Steps
1. `npm run dev:server` + `npm run dev` 동시 기동 후 등록→지도→경보→추천 플로우를 브라우저에서 수동 확인.
2. `riskFormula.test.ts` 단위 테스트로 ±10/20/30% 경계값 정확성 확인.
3. demoScenario 조합에 대해 `/api/risk` 응답이 항상 tier='경계'인지 회귀 테스트로 고정.
4. 대시보드 2개 차트가 등록 데이터 없이도 렌더링되는지 확인 (독립성 검증).

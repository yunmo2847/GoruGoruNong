# 고루고루농 — 농산물 수급 불균형 해소 앱

전국 시군구 재배계획을 평년값과 비교해 수급 불균형을 조기 경보하고, 대체작물을 추천하는 풀스택 데모.

- **프론트엔드**: Vite + React 19 + TypeScript (모바일 프레임 UI, `src/`)
- **백엔드**: Express + TypeScript (tsx 실행, `server/`) — 포트 5174
- **데이터 아키텍처**: 스냅샷 우선
  - *오프라인 동결 스냅샷* — 평년값·시장통계·장기기후를 `npm run snapshot:refresh`로 일괄 갱신한다. 앱 런타임은 외부 API를 호출하지 않는다.
  - *라이브(파일 기반)* — 사용자 등록 재배계획. `server/.data/plans.json` 에 저장되어 서버 재시작 후에도 유지.

## 실행

```bash
npm install
npm run snapshot:refresh  # 전체 오프라인 스냅샷 갱신
npm run dev:all     # web(5173) + api(5174) 동시 실행
# 또는 개별: npm run dev  /  npm run dev:server
```

브라우저에서 http://localhost:5173 접속. Vite dev 서버가 `/api/*` 를 백엔드(5174)로 프록시한다(`vite.config.ts`).

### 데모 계정 (서버 시작 시 자동 시드)

```
demo@sugub.kr / demo1234
```

로그인하면 전국에 미리 시드된 재배계획(demoScenario 포함)이 지도·비교 화면에 채워져 있다.
**demoScenario**(해남군 × 배추)는 항상 평년 대비 +46% → `경계` 등급으로 고정된다(`src/lib/demoScenario.test.ts` 로 회귀 잠금).

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | Vite 프론트엔드 (5173) |
| `npm run dev:server` | Express 백엔드 (5174, tsx watch) |
| `npm run dev:all` | 둘 동시 실행 |
| `npm run seed` | 공식 XLS 우선으로 베이스라인·시장통계 스냅샷 재생성 |
| `npm run seed:climate` | ARCCAS 장기 기후 시나리오 스냅샷 재생성 |
| `npm run snapshot:refresh` | 외부 연결 없이 전체 스냅샷 일괄 갱신(기본) |
| `npm run snapshot:refresh:live` | 설정된 공급자 API를 시도한 뒤 전체 스냅샷 갱신 |
| `npm run test` | vitest (riskFormula / recommendation / nationwideComparison / demoScenario / units / normalization / climateAlert / cache) |
| `npm run build` | tsc + vite 프로덕션 빌드 |
| `npm run lint` | oxlint |

## 공식 XLS 파일로 갱신 (현재 기본 방식)

제공받은 KAMIS·KOSIS 원본은 `data/import/`에 보관한다. 앱 런타임은 원본
파일이나 외부 API를 직접 읽지 않고, 아래 명령으로 생성된 JSON 스냅샷만 읽는다.

```bash
npm run snapshot:refresh
```

- KAMIS 가격: `data/import/kamis/`의 고정 파일명을 새 다운로드 파일로 교체한다.
- KOSIS 면적·생산량: `data/import/kosis/`의 XLS/XLSX를 교체한다.
- 가격은 최신 연도를 현재값, 이전 최대 5개 연도를 월별 평균으로 사용한다.
- 원자료 포장가격은 배추 10kg, 양파 20kg, 마늘 20kg, 감자 20kg,
  대파 1kg, 고추 10kg으로 나누어 모두 `원/kg`으로 표시한다.
- KOSIS 여러 연도가 있으면 최신 연도와 이전 최대 5개년 평균을 비교한다.
  현재 파일은 2025년만 포함하므로 생산량 평년 막대는 숨긴다.
- KOSIS 시도 재배면적은 앱의 해당 시도 내 시군구에 균등 배분한다. 원본에
  없는 품목의 재배면적만 기존 결정적 기준값으로 보완한다.

파일명과 교체 방법은 [`data/import/README.md`](data/import/README.md)에 정리되어 있다.
변환기는 `scripts/integrations/officialFiles.ts`이며, 생성 결과는
`src/data/baseline.json`과 `src/data/market-stats.json`이다.

## 환경변수 (`.env`, `.gitignore` 처리됨)

`.env.example` 참고. **키·시크릿은 라이브 스냅샷 갱신 스크립트와 서버(Node 측)에서만 로드되며 `src/` 클라이언트 코드에서는 절대 import 하지 않는다.** 기본 `snapshot:refresh`는 외부 API 키를 사용하지 않는다.

- `KAMIS_KEY` + `KAMIS_ID` / `KOSIS_KEY` / `MAFRA_KEY` — 공식 파일이 없을 때 `seed-baseline.ts`의 선택적 API 연동에 사용한다.
- `APIHUB_KEY` / `AMIS_KEY` / `ARCCAS_KEY` / `NCPMS_KEY` — 향후 라이브 스냅샷 갱신용. 현재 런타임 `/api/climate-alert`는 외부 API를 호출하지 않는다.
- `JWT_SECRET` — 세션 쿠키 서명(서버 전용). `PORT` — 백엔드 포트.

## 선택적 API 연동 (공식 파일이 없을 때)

기본은 위 공식 XLS 스냅샷이다. 파일이 없는 항목은 아래 API 설정이 있으면 API를
시도하고, 그것도 없으면 결정적 기준값으로 폴백한다.

| 우리 데이터 | 실소스 | 필요한 키 | 어댑터 |
|---|---|---|---|
| `baseline.json` 평년 **재배면적** | **KOSIS** 농작물생산조사 (시도값 → 시군구 균등 배분) | `KOSIS_KEY` | `scripts/integrations/kosis.ts` |
| `market-stats.json` **가격추이** | **aT** 일별 도·소매 가격 (공공데이터포털) | `AT_SERVICE_KEY` | `scripts/integrations/atDataGo.ts` |
| ″ (대안) | **KAMIS** 직접 API | `KAMIS_KEY`+`KAMIS_ID` | `scripts/integrations/kamis.ts` |
| `market-stats.json` **생산량** | **MAFRA** (농림축산식품 공공데이터포털) | `MAFRA_KEY` | `scripts/integrations/mafra.ts` |

가격은 **aT(우선) → KAMIS → 합성** 순으로 폴백한다. aT 품목코드는 KAMIS 와 동일 체계라 `integration-codes.json` 의 `kamis.items` 를 재사용한다.

**절차**

1. **키 발급** (직접):
   - **KOSIS** [필수]: <https://kosis.kr/openapi/index/index.jsp> → `apiKey`(=`KOSIS_KEY`)
   - **aT (가격)**: [공공데이터포털 15156057](https://www.data.go.kr/data/15156057/openapi.do) → 활용신청 → **일반 인증키(Decoding)**(=`AT_SERVICE_KEY`)
   - **MAFRA (생산량)**: <https://data.mafra.go.kr/> → 회원가입 시 자동 발급 인증키(=`MAFRA_KEY`)
2. **`.env`에 키 입력** (`.env.example` 참고).
3. **`src/data/integration-codes.json` 코드 보완** — 발급 후 각 포털 상세에서 확인해 채운다:
   - **KOSIS** `areaTblId`(재배면적 통계표 ID)·`provinceCodes`/`cropCodes`(통계표 메타 분류코드)·`itmIdArea` — 비면 KOSIS 건너뜀
   - **aT** `atDataGo.baseUrl`(승인 후 '활용신청 상세'의 요청주소)·`params`(요청변수명) — 비면 aT 건너뜀
   - **MAFRA** `mafra.service`(서비스명)·`cropField`/`productionField`/`yearField`(응답 필드명) — 비면 MAFRA 건너뜀
4. **라이브 스냅샷 갱신**: `npm run snapshot:refresh:live`
   - 로그에 소스별로 표시된다: `재배면적:LIVE-KOSIS 가격:LIVE-aT 생산량:LIVE-MAFRA` = 실데이터, `synthetic-*` = 스냅샷.

**안전장치**: 키 누락·통계표/서비스 미설정·호출 실패·응답형식 불일치 등 **어떤 오류에도 해당 항목만 자동 스냅샷 폴백**해 앱이 깨지지 않는다(항목·부분 단위 성공 허용). 단, 시군구 재배면적은 시도 통계를 균등 배분한 **근사치**다(정밀 시군구 데이터가 필요하면 KOSIS 시군구 단위 통계표로 `integration-codes.json`을 교체).

## 기후·병충해 위험도 알림

지도 화면에서 지역 타일을 선택하면 수급 경보(`RiskAlertPanel`) 아래에 **기후·병충해 위험도 카드**(`ClimateAlertCard`)가 뜬다. 기상·병충해·장기기후 3개 축을 생육단계(초기/생육기/수확기) 가중치로 합산해 종합 점수(0~100)와 tier(정상/주의/경보)를 내고, 조건에 따라 3가지 알림을 분기한다.

| 데이터 | 실소스 | 필요한 키 | 어댑터 |
|---|---|---|---|
| S_weather (기상) | **APIHUB**(기상청 API허브) | `APIHUB_KEY` | `scripts/integrations/apihub.ts` |
| ″ (대안/보완) | **AMIS**(농촌진흥청 농업기상관측, 공공데이터포털 15078057) | `AMIS_KEY` | `scripts/integrations/amis.ts` |
| S_pest (병충해) | **NCPMS**(국가농작물병해충관리시스템, 공공데이터포털 15058192) | `NCPMS_KEY` | `scripts/integrations/ncpms.ts` |
| S_longterm (장기기후) | **ARCCAS**(농업·농촌 기후정보시스템, ~2100년 SSP 시나리오) | `ARCCAS_KEY` | `scripts/integrations/arccas.ts` |

**아키텍처**: 앱 런타임은 외부 API를 호출하지 않는다. ARCCAS 장기기후는 `src/data/climate-longterm.json` 스냅샷을 읽고, 기상·병해충 축은 내장된 결정적 기준값을 사용한다. `npm run snapshot:refresh`가 오프라인 스냅샷 전체를 갱신하며, API 연결이 복구된 경우에만 `npm run snapshot:refresh:live`를 사용한다.

**알림 분기 3종** (`src/lib/climateAlert.ts`의 `branchAlert`, 서로 다른 조건):
- **즉시알림**: 종합 tier가 `경보`일 때
- **방제안내**: 병충해 점수(S_pest)가 임계값 이상일 때(tier와 무관)
- **대체작물 추천 트리거**: 병충해가 원인이 되어 경보에 도달했을 때(위 둘의 AND) — `src/lib/recommendation.ts` 추천 카드를 자동으로 펼친다.

**키 발급처**:
- APIHUB: <https://apihub.kma.go.kr> → 회원가입 → 서비스 신청 → 마이페이지 인증키 현황
- AMIS: [공공데이터포털 15078057](https://www.data.go.kr/data/15078057/openapi.do) → 활용신청
- NCPMS: [공공데이터포털 15058192](https://www.data.go.kr/data/15058192/openapi.do) → 활용신청
- ARCCAS: <https://arccas.or.kr> → 리서치 시점 기준 확정된 공개 REST API 스펙을 찾지 못함, 이용기관 문의 필요(찾으면 `integration-codes.json`의 `arccas.baseUrl`만 채우면 바로 연동)

`.env`에 키 입력 후 `src/data/integration-codes.json`의 엔드포인트·코드 매핑을 보완하면 라이브 갱신을 다시 활성화할 수 있다. 연결 전에는 `npm run snapshot:refresh`만 사용한다.

## 지도 데이터 (GeoJSON 관련 주석)

현재 지도(`src/components/HeatmapMap.tsx`)는 **네트워크 타일 의존이 없는 시군구 좌표 기반 choropleth(버블) 렌더**를 사용한다 — 데모 신뢰성(오프라인 안전)을 위한 선택이다. RiskTier 색상 매핑은 정상=회색·관심=연노랑·주의=주황·경계=빨강.

프로덕션에서 폴리곤 choropleth 가 필요하면 **pre-simplified·라이선스 명확한 공개 시군구 경계 GeoJSON**(예: 통계청 SGIS 행정경계 또는 공개 simplified TopoJSON, 저작권/라이선스 확인 후 사용)을 배경 레이어로 추가하면 된다. `src/data/sigungu.json` 의 `code`(시군구 코드)로 조인한다. 전국 시군구 좌표는 이미 `sigungu.json` 에 포함되어 있어 broadened 데이터셋 전체가 지도에 분포한다.

## 주요 검증

```bash
npm run test                         # 63 tests (경계값·추천 랭킹/monotonicity·집계·demoScenario 회귀·
                                      #           평 단위 변환·정규화 레이어·기후알림 스코어링/분기·TTL 캐시)
npm run build                        # tsc(app+server) + vite 성공
grep -rEi "JWT_SECRET|KAMIS_KEY|APIHUB_KEY|..." dist/   # 시크릿 노출 0건
```

- 재시작 지속성: 계획 등록 → 서버 재시작 → 계획 유지(`server/.data/plans.json`).
- 인증: 미로그인 시 `POST /api/plans` → 401; 비밀번호는 bcrypt 해시 저장(`server/.data/users.json` 에 평문 없음).
- UI 검증: `npx playwright install chromium` 후 dev 서버 구동 상태에서 직접 브라우저를 구동해 스크린샷으로 확인(`playwright`는 devDependency로 포함됨).

## 스펙 / 계획 문서

- 스펙: `.omc/specs/deep-interview-agri-supply-demand-app.md`
- 실행 계획: `.omc/plans/plan-agri-supply-demand-app.md`
- 리브랜딩/UX 보완 + 기후·병충해 알림: `.omc/plans/plan-rebrand-ux-fixes-climate-pest-alerts.md`
# GoruGoruNong

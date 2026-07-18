# Work Plan: 리브랜딩·UX 보완 + 기후·병충해 위험도 알림 기능

Status: **pending approval**

## Requirements Summary

이번 작업은 두 갈래다.

**A. 기존 앱 보완(소~중 규모)**
1. 앱 이름 "수급밸런스" → "고루고루농" 전면 교체
2. UI 짤림 수정 — 전국 비교 테이블, 내정보/로그인 헤더 이미지, 추천·대시보드 카드 (사용자 확인 완료)
3. 면적 표시 단위 ha → 평 (등록 입력은 평으로 받되, 서버/스키마/기존 회귀 테스트는 ha 그대로 유지)
4. 디자인 톤 유지 + 디테일 다듬기 (사용자가 "현재 톤 유지" 선택)
5. 내정보(Profile) 페이지 배경 사진을 `hero.png` → `farm.png`로 교체 (파일은 이미 `src/assets/farm.png`에 존재 확인됨)

**B. 신규 기능(대규모) — 기후·병충해 위험도 알림**
1. APIHUB(기상청)·AMIS(농촌진흥청 농업기상관측)·ARCCAS(농업·농촌 기후정보시스템)·NCPMS(국가농작물병해충관리시스템) 4개 외부 소스 연동
2. 지역코드·시간단위·작물코드 통합 정규화 레이어
3. S_weather / S_pest / S_longterm 개별 스코어 계산
4. 가중합 종합 위험도 + 생육단계별 가중치 조정
5. 임계값 초과 시 알림 분기(즉시알림/방제안내/대체작물 추천 트리거)

사용자 확정 사항:
- 연동 전략: 이 프로젝트의 기존 패턴(실 API 시도 → 실패 시 결정적 폴백, `scripts/integrations/*.ts` 참고)을 그대로 따른다.
- AMIS = 농촌진흥청 농업기상관측 데이터(공공데이터포털, data.go.kr).
- UI 짤림 대상 화면: 전국 비교 테이블, 내정보/로그인 헤더, 추천/대시보드 카드.
- 디자인: 큰 리브랜딩이 아니라 현재 그린 톤·카드형 모바일 UI를 유지하며 디테일만 개선.

## Acceptance Criteria

### A. 리브랜딩 & UX 보완
- [ ] `수급밸런스` 문자열이 앱 어디에도 남지 않음 — `index.html:7`, `README.md:1`, `src/App.tsx:59`, `src/index.css:1`(주석), `src/pages/Login.tsx:16-17` 전부 `고루고루농`으로 교체 (빌드 산출물 `dist/`는 재빌드 시 자동 갱신되므로 별도 수정 불필요)
- [ ] `src/pages/Profile.tsx:2,31`의 `farmImg` import가 `../assets/farm.png`를 가리킴; `src/pages/Login.tsx:2,12`는 `hero.png` 유지(로그인 화면은 변경 대상 아님, 사용자 요청은 "내정보"로 한정)
- [ ] 신규 `src/lib/units.ts`에 `haToPyeong(ha)` / `pyeongToHa(pyeong)` 변환 함수 존재(1ha = 3025.62평, 반올림 정책 명시); 단위테스트로 왕복 변환 검증
- [ ] `src/components/PlanForm.tsx`의 재배면적 입력 라벨이 "평"으로 바뀌고, 입력값을 `pyeongToHa`로 변환해 기존과 동일하게 `api.createPlan`에 ha로 전송(서버 스키마·`riskFormula.test.ts`·`demoScenario.test.ts`는 무변경으로 계속 통과)
- [ ] `src/ui.tsx`의 `fmtHa`를 대체/보완하는 `fmtPyeong`이 존재하고, `src/pages/Profile.tsx:21,49,58`, `src/components/NationwideComparison.tsx:180-181`, `src/components/RiskAlertPanel.tsx`의 면적 표시가 전부 평 단위로 렌더링됨
- [ ] `src/components/NationwideComparison.tsx`의 테이블이 390px 프레임에서 가로 스크롤 시각적 힌트(예: 그림자/화살표) 또는 컬럼 축소(지역/작물 서브텍스트 숨김 등)로 "잘려 보이는" 느낌 없이 사용 가능 — 실제 폰 프레임(390×844)에서 스크린샷으로 확인
- [ ] `src/pages/Profile.tsx:30-36`, `src/pages/Login.tsx:11-25`의 헤더 이미지 영역에서 타이틀 텍스트가 겹치거나 잘리지 않음 — 헤더 높이/패딩/오버랩 마진 조정 후 스크린샷 확인
- [ ] `src/components/RecommendationCard.tsx`, `src/pages/Dashboard.tsx`(recharts 컨테이너)에서 라벨·범례·차트가 카드 경계를 넘지 않음 — 스크린샷 확인
- [ ] `npm run build` 성공, `npm run test` 전체 통과(기존 25개 + 신규 unit 변환 테스트)

### B. 기후·병충해 위험도 알림
- [ ] `scripts/integrations/{apihub,amis,arccas,ncpms}.ts` 4개 어댑터 존재, 각각 키 미설정/호출 실패 시 `null` 반환(throw 금지) — 기존 `kosis.ts`/`atDataGo.ts`/`mafra.ts`와 동일한 방어적 파싱 패턴
- [ ] `src/lib/climateAlert.ts`(순수 함수)에 `computeWeatherScore`, `computePestScore`, `computeLongtermScore`, `combineAlertScore(scores, growthStageWeights)` 존재; 가중치는 단일 config 객체(`recommendation.ts`의 `WEIGHTS` 패턴과 동일)
- [ ] 생육단계 가중치: 등록 계획의 `plant`/`harvest` 월(이미 `server/store/plans.ts`의 `Plan.plant/harvest`에 존재)로부터 경과율(%)을 계산해 초기/생육기/수확기 3단계 중 하나를 결정하고, 단계별 가중치 배수를 적용
- [ ] `GET /api/climate-alert/:region/:crop` — 종합 위험도 점수, 단계(정상/주의/경보), tier별 알림 분기(즉시알림 텍스트/방제안내 텍스트/대체작물 추천 트리거 여부) 반환
- [ ] ARCCAS(장기 기후 시나리오, 2100년까지)는 `scripts/seed-baseline.ts`와 동일한 "동결 스냅샷" 패턴으로 `src/data/climate-longterm.json` 생성(자주 안 바뀌므로); APIHUB/AMIS(실시간 관측)·NCPMS(병해충 예찰, 주기 갱신)는 서버측 TTL 캐시(예: 날씨 1시간, 병해충 6~12시간) + 실패 시 기존 `src/lib/climateRisk.ts` 결정적 mock으로 자동 폴백
- [ ] 임계값 초과 시 알림 분기 3종(즉시알림/방제안내/대체작물 트리거)이 각각 다른 조건에서 발동함을 단위테스트로 검증(결정적 입력 → 결정적 분기 결과)
- [ ] 신규 API 키(APIHUB/AMIS/ARCCAS/NCPMS) 누락 시에도 앱이 크래시 없이 기존 mock 값으로 동작(빌드+테스트로 확인)
- [ ] `dist/` 빌드 산출물에 4개 신규 키 문자열 노출 0건 (기존 보안 그렙 확장)

## Implementation Steps

### A트랙 (선행, 상대적으로 작음)
1. **리브랜딩**: `index.html:7`, `README.md:1`, `src/App.tsx:59`, `src/index.css:1`, `src/pages/Login.tsx:16-17`의 `수급밸런스` → `고루고루농` 일괄 치환.
2. **Profile 사진 교체**: `src/pages/Profile.tsx:2`의 import 경로만 `farm.png`로 변경(이미 자산 존재, 추가 작업 불요).
3. **단위 변환 유틸**: `src/lib/units.ts` 신설(`haToPyeong`/`pyeongToHa`, 1ha=3025.62평 상수 + `units.test.ts`).
4. **등록 폼**: `src/components/PlanForm.tsx` 라벨/placeholder를 "평"으로, 제출 직전 `pyeongToHa`로 변환(서버 페이로드는 변경 없음 — 5필드 스키마·회귀 테스트 안전).
5. **표시 레이어**: `src/ui.tsx`에 `fmtPyeong` 추가(또는 `fmtHa`를 대체), `Profile.tsx`/`NationwideComparison.tsx`/`RiskAlertPanel.tsx`에서 사용 전환.
6. **UI 짤림 수정**: (a) NationwideComparison 테이블 — 좁은 화면에서 스크롤 힌트 그라디언트 추가 또는 지역/작물 서브텍스트 조건부 숨김. (b) Profile/Login 헤더 — 이미지 높이·패딩·오버랩 마진 재조정. (c) RecommendationCard/Dashboard — 차트 컨테이너 높이·라벨 폰트 크기 조정.
7. **디자인 디테일**: 그린 톤·카드형 레이아웃 유지, 여백/그림자/타이포 미세 조정(리브랜딩 이름과 어울리는 포인트 컬러 재확인 정도).
8. **검증**: `npm run dev:all`로 5개 화면(Login/Map/Register/Comparison/Dashboard/Profile) 390×844 프레임에서 스크린샷 확인 → 짤림 해결 확인.

### B트랙 (신규 기능, 대규모 — A트랙 완료 후 순차 진행 권장)
9. **어댑터 4종**: `scripts/integrations/apihub.ts`(기상청 관측), `amis.ts`(농업기상관측), `arccas.ts`(장기 기후 시나리오), `ncpms.ts`(병해충 예찰/검색) — 각각 `fetchJson` 재사용, 키/설정 미비 시 `null` 반환.
10. **정규화 레이어**: `src/lib/normalization.ts` — 지역코드(APIHUB 관측지점코드/NCPMS 지역코드 → `sigungu.json` code), 시간단위(실시간/일별/장기 시나리오 → 일별 단위 통일), 작물코드(NCPMS/RDA 코드 → `cropSuitability.json` 작물명) 매핑 테이블.
11. **스코어 모듈**: `src/lib/climateAlert.ts` — `computeWeatherScore`(APIHUB+AMIS), `computePestScore`(NCPMS), `computeLongtermScore`(ARCCAS), `combineAlertScore` 가중합(설정 객체 `ALERT_WEIGHTS`).
12. **생육단계 가중치**: 등록 계획의 plant/harvest로 경과율 계산 → 초기/생육기/수확기 3단계 가중치 배수 테이블(config).
13. **API 라우트**: `server/routes/climate-alert.ts` + `server/index.ts`에 `GET /api/climate-alert/:region/:crop` 등록. 응답에 tier(정상/주의/경보) + 알림 분기(즉시알림/방제안내/추천트리거) 포함.
14. **캐시/스냅샷 분리**: ARCCAS는 `scripts/seed-baseline.ts`에 확장 또는 `scripts/seed-climate.ts` 신설로 `src/data/climate-longterm.json` 동결 생성. APIHUB/AMIS/NCPMS는 서버 메모리 TTL 캐시(간단한 `Map<key,{data,expiresAt}>`) 적용.
15. **알림 분기 UI**: 기존 `RiskAlertPanel.tsx`/`RecommendationCard.tsx` 옆에 기후·병충해 경보 카드 추가(또는 `RiskAlertPanel` 확장) — 즉시알림 배지, 방제안내 텍스트, "대체작물 추천 보기" 버튼과 연결(기존 `recommendation.ts` 재사용).
16. **테스트**: `climateAlert.test.ts`(스코어 단조성·임계값 분기 결정적 검증), `normalization.test.ts`(코드 매핑 정확성).
17. **문서화**: README에 4개 신규 키 발급처·`integration-codes.json` 확장 필드 안내 추가(기존 KOSIS/aT/MAFRA 섹션과 동일한 포맷).

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| 4개 신규 API 키 발급에 시간이 걸림(KOSIS 사례처럼) | 기존 패턴대로 키 없이도 결정적 mock으로 전체 파이프라인 동작 — 사용자가 이미 이 전략을 선택함 |
| 평 변환 시 반올림 오차로 폼 입력↔표시 값이 미세하게 달라 보임 | 변환 상수를 한 곳(`units.ts`)에만 두고 소수점 정책(정수 평, 소수1자리 ha)을 문서화 + 왕복 테스트 |
| ha→평 전환이 서버/테스트에 실수로 전파되어 `demoScenario` 회귀가 깨짐 | 서버·`riskFormula`·`nationwideComparison`은 절대 손대지 않고 **표시 레이어와 입력 파싱 경계에서만** 변환 — 이미 명세한 대로 |
| ARCCAS(2100년 시나리오)를 실시간 데이터처럼 취급해 매 요청마다 재조회 | 원칙 #5(동결 스냅샷)를 그대로 적용해 장기 시나리오는 seed 방식으로 분리 |
| 4개 소스의 지역/시간/작물 코드 체계가 제각각이라 정규화 오류 발생 | 정규화 레이어를 별도 모듈로 분리해 단위테스트, 매핑 실패 시 해당 레코드만 스킵(전체 폴백 아님) |
| UI 짤림 수정이 스크린샷 없이 "느낌"으로만 판단되어 재발 | 실제 dev 서버 구동 후 390×844 프레임 스크린샷으로 각 화면 확인(구두 승인 아님) |

## Verification Steps
1. `npm run build` — tsc + vite 성공, `dist/` 그렙으로 신규 키 노출 0건 확인.
2. `npm run test` — 기존 25개 + `units.test.ts` + `climateAlert.test.ts` + `normalization.test.ts` 전부 통과.
3. `npm run dev:all` 구동 후 브라우저에서 Login/Map/Register/Comparison/Dashboard/Profile 6개 화면 스크린샷 — 짤림 해결 확인, 앱명 "고루고루농" 노출 확인, 내정보 배경이 `farm.png`인지 확인.
4. 재배면적 등록 시 "평" 단위로 입력 → 등록 후 지도/비교 화면에 동일 값이 "평"으로 표시되고, 내부적으로 `demoScenario` 회귀(`src/lib/demoScenario.test.ts`)가 여전히 통과하는지 확인(ha 기준 계산 불변 검증).
5. 키 없이 `GET /api/climate-alert/:region/:crop` 호출 시 mock 값으로 정상 응답(크래시 없음) 확인.
6. (키 발급 후, 선택) 각 어댑터 실 호출 로그에 `LIVE-*`/`FALLBACK` 표시로 실제 연동 여부 확인.

## Open Items (실행 전 확정 필요 — 계획 승인 시 함께 논의)
- B트랙은 범위가 매우 크다. 한 번에 다 구현할지, A트랙(리브랜딩/UX) 먼저 완료 후 B트랙을 별도 세션으로 진행할지 실행 승인 시 정해야 한다.
- `growthStages`(생육단계) 가중치를 작물별로 세분화할지, 우선 공통 3단계(초기/생육기/수확기)로 시작할지 — 본 계획은 MVP로 공통 3단계를 채택했다.

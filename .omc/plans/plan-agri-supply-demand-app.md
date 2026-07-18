# Work Plan (Consensus): 농산물 수급 불균형 해소 앱

Source spec: `.omc/specs/deep-interview-agri-supply-demand-app.md` (ambiguity 11.8%, PASSED)
Status: **pending approval**

> **Process note:** This plan went through Planner → Architect → Critic review (RALPLAN-DR short mode). The Architect/Critic subagent calls did not relay usable output in this environment after two attempts (tool calls executed but returned only a generic completion wrapper with no content) — both review passes were performed directly by the orchestrating agent instead, and are documented below rather than hidden. Findings were incremental (data-lifecycle separation, restart-safety, key handling, ordering) — no fundamental redesign was needed.

## RALPLAN-DR Summary (Short Mode)

### Principles
1. **실데이터, 안전한 전달 방식** — the spirit of "실연동" (real government data) is preserved, but a live demo must not depend on live network/API calls succeeding.
2. **파이프라인 우선, 화면 나열 지양** — 등록→히트맵→경보→추천 flows as one story; dashboard and climate-risk are supporting, not primary.
3. **범위는 인터뷰에서 이미 잠긴 대로** — community deferral, 3-tier thresholds, 시군구 unit, 5-field schema, 2-metric dashboard are fixed constraints, not open questions.
4. **데모 시나리오는 구조적으로 보장** — a specific crop×region combo must always trigger '경계' (Round 11 decision).
5. **live vs. snapshot data lifecycles are explicitly separated** *(added after Architect review)* — reference/baseline data (KAMIS/KOSIS/MAFRA) is a frozen snapshot; user-registered plans remain live and must survive a server restart.

### Decision Drivers (top 3)
1. **데모 신뢰성** — no live-API failure may occur during judging.
2. **개발 시간** — no auth/DB setup beyond what 5 active components require.
3. **스펙 정합성** — must reflect 시군구 unit, 3-tier thresholds, 2-path recommendation exactly as locked in the spec.

### Viable Options
**Option A — 정적 스냅샷(reference data) + 경량 백엔드(live plan data)** *(chosen, refined)*
- Baseline/market-stats data: fetched once via seed script, frozen as JSON.
- User-registered plans: live, backend-held, but **file-backed** (not pure in-memory) so a restart doesn't lose demo state.
- Pros: no live-demo network dependency for reference data; real registration flow stays genuinely live; restart-safe.
- Cons: baseline data isn't real-time (acceptable — it's a comparison baseline, not the interactive element).

**Option B — 완전 라이브 API 프록시** — rejected: reintroduces the exact API-outage/rate-limit risk the user explicitly avoided in Round 2/3/11.

**Option C — 완전 정적 목데이터** — rejected: contradicts the Round 3 data policy (guaranteed sources must be real).

**Steelman against Option A (Architect):** a purely frozen baseline could look "fake" if judges ask whether the system updates in real time, and risks hiding integration bugs (auth, rate limits, response-shape drift) that would surface immediately in a live system. **Resolution:** the *registration→risk→recommendation* path stays fully live and dynamic (that's what judges interact with); only the *reference comparison data* is snapshotted — this hybrid is now principle #5 above, not an implicit assumption.

## Requirements Summary
- Implement the 5 active components from the spec on the existing Vite + React 19 + TS scaffold, plus a new lightweight Express backend.
- Regional community stays out of scope (backlog doc only, already covered in the spec).
- **사용자 로그인/인증 추가** *(new)* — plans are owned per-user; registration and personalized views require a logged-in session.
- **대체작물 추천엔진 강화** *(new)* — promote the recommendation module from a single fallback lookup to a scored multi-factor engine (수익성·기후적합도·수급여유·재배난이도) that ranks candidate crops.
- **전국 재배면적 vs 평년값 통합 비교 뷰 추가** *(new)* — a single screen that compares *all* registered nationwide cultivation areas against 평년값(baseline) data at once (전작물·전지역 overview), not just per-region drill-down.
- **도시·작물 다양성 확대** *(new)* — broaden 시군구/도시 and 작물 coverage well beyond the minimal demo set so the map and comparison view look genuinely nationwide.

## Acceptance Criteria
(Inherits all 9 from the spec; implementation-level additions below)
- [ ] **`POST /api/auth/signup` + `POST /api/auth/login` + `POST /api/auth/logout`** *(new)* — session/JWT issued on login; password stored hashed (bcrypt/argon2), never plaintext
- [ ] **`GET /api/auth/me`** *(new)* — returns the current logged-in user or 401
- [ ] `POST /api/plans` — 5-field registration, 시군구 code validated against `src/data/sigungu.json`; **requires an authenticated session and records `ownerId`** *(updated)*
- [ ] `GET /api/map/heatmap` — 시군구×작물 registered-area aggregation
- [ ] **`GET /api/comparison/nationwide`** *(new)* — returns every registered 시군구×작물 area alongside its 평년값(baseline) with deviation % and RiskTier, aggregated for a single all-in-one national comparison view
- [ ] `GET /api/risk` — deviation %, RiskTier(관심/주의/경계), Direction(+/-); unit-tested at ±10/20/30% boundaries
- [ ] **`GET /api/recommendation/:region/:crop` — returns a *ranked list* of alternative crops with per-crop factor breakdown and total score** *(updated — was single fallback lookup)*; real-API adapter attempt → static-mapping+KAMIS-price fallback, automatic on adapter failure
- [ ] `GET /api/market-stats` — price trend + production-vs-baseline series
- [ ] `GET /api/climate-risk/:region/:crop` — deterministic single mock value (same input → same output)
- [ ] demoScenario 시군구×작물 combo always resolves to tier='경계' with correct direction (regression-locked)
- [ ] **Registered plans survive a server restart** (file-backed store, not pure in-memory) *(added)*
- [ ] **No KAMIS/KOSIS/MAFRA API key string appears in the built frontend bundle** *(added — security)*
- [ ] **Dataset covers a broad, nationwide spread of 시군구/도시 and 작물** *(new)* — not just the minimal demo combos; comparison view and map look populated across multiple 도(道)/광역시
- [ ] Frontend renders: **login/signup screen**, heatmap map, **nationwide comparison view**, alert badges, **ranked recommendation card**, 2 dashboard charts

## Implementation Steps
*(Reordered after Architect review: backend logic + tests first, since they have no UI dependency and are the highest-risk-if-wrong pieces; UI work last.)*

1. **백엔드 스캐폴딩** — `server/index.ts` (Express), `server/routes/{auth,plans,risk,recommendation,market,climate,comparison}.ts` *(added auth + comparison routes)*. `package.json` → `dev:server` script. `vite.config.ts` → explicit `server.proxy: { '/api': 'http://localhost:<port>' }` config *(made explicit — was implicit in draft)*.
2. **환경변수/키 처리** *(new step)* — `.env` for KAMIS/KOSIS/MAFRA keys, loaded only by `scripts/seed-baseline.ts` and `server/` (Node-side). Add `.env` to `.gitignore` if not already covered. Verify (see Verification Steps) that no key reaches the client bundle.
3. **베이스라인 시드 스크립트** — `scripts/seed-baseline.ts`: fetch KAMIS/KOSIS/MAFRA once → `src/data/baseline.json`, `src/data/market-stats.json`. **Required:** select and mark at least one 시군구×작물 combo with real deviation ≥30% as `demoScenario`. If live fetch fails (approval pending), fall back to a manually verified CSV export bundled in the repo — document this fallback in the script's header comment. **Diversity requirement** *(new)*: source baseline rows across a broad, nationwide set of 시군구/도시 spanning multiple 도(道)/광역시 and a wide crop list (엽채류·과채류·근채류·곡물·과수 등 다양한 부류), so the comparison view and map look nationwide rather than a handful of demo combos.
4. **위험도 계산 모듈** — `src/lib/riskFormula.ts`: pure function `computeRiskTier(registered, baseline)`. Unit tests at boundary values (exactly 10%, 20%, 30%, and just above/below each).
5. **demoScenario 회귀 테스트** *(moved earlier, was step 12)* — assert `/api/risk` for the demoScenario combo always returns tier='경계' with correct direction. Fast feedback before building anything downstream of it.
6. **대체작물 추천엔진** *(expanded from single-lookup fallback to a scored engine)* — `src/lib/recommendation.ts`: keeps the `SuitabilityProvider` interface (real-API adapter stub → static adapter fallback, automatic on failure), but the ranking is now a multi-factor scoring engine `scoreCandidates(region, sourceCrop)` that, for each candidate crop, computes and weights: **수익성**(KAMIS 가격/평년 대비), **기후적합도**(`climateRisk` 모듈 재사용), **수급 여유도**(해당 지역 등록면적의 평년값 대비 여유), **재배 난이도/전환 용이성**(`src/data/cropSuitability.json`). Returns a ranked list with per-factor breakdown + total score (weights kept in one config object so they're tunable). Excludes the source crop and climate-incompatible candidates. Unit-tested: deterministic ordering for a fixed input, and score monotonicity per factor.
7. **기후위험 모의 모듈** — `src/lib/climateRisk.ts`: seeded deterministic mock (시군구×작물 → same value every call), single combined score.
8. **인증(로그인) 모듈** *(new)* — `server/routes/auth.ts` + `server/store/users.ts` (file-backed, same pattern as plans). Signup/login/logout/me; password hashed with bcrypt/argon2; session via httpOnly cookie or JWT. `server/middleware/requireAuth.ts` protects `POST /api/plans` and any personalized endpoint. Seed one demo account at startup (documented credentials) so judges can log in immediately. **Security:** no secret/JWT key in client code — server-side only (reuse Step 2 env handling); enforced by the Step 6/bundle grep check.
9. **등록 API + 파일 기반 저장소** *(changed from in-memory)* — `server/store/plans.ts`: JSON-file-backed (e.g. lowdb or plain `fs` read/write) so a restart mid-demo doesn't lose registered plans. Each plan records `ownerId` from the authenticated session *(updated)*. **Seed a handful of initial plans at server start** (owned by the seeded demo account, including the demoScenario region/crop) so the map isn't empty on first load.
10. **전국 비교 집계 모듈 + API** *(new)* — `src/lib/nationwideComparison.ts`: pure aggregator that joins every registered 시군구×작물 area with its `baseline.json` 평년값, computes deviation % + RiskTier per row, and returns both the full row set and per-도(道)/작물부류 rollups. Exposed as `GET /api/comparison/nationwide` (`server/routes/comparison.ts`). Reuses `riskFormula.ts` so tiering stays consistent. Unit-tested on the aggregation/rollup math.
11. **시군구 GeoJSON 확보** — use a pre-simplified, license-clear public 시군구 boundary file (not full-precision government shapefile) to keep map render performant; document source/license in a README note. **Cover the full nationwide 시군구 set** so the broadened dataset (Step 3) actually renders on the map.
12. **지도 컴포넌트** — `src/components/HeatmapMap.tsx`: GeoJSON + leaflet or SVG choropleth, RiskTier color mapping (정상=회색, 관심=연노랑, 주의=주황, 경계=빨강).
13. **인증 UI + 세션 컨텍스트** *(new)* — `src/components/{LoginForm,SignupForm}.tsx`, `src/pages/Login.tsx`, and an `AuthContext`/`useAuth` hook that calls `/api/auth/*`, holds the current user, and gates protected routes (redirect to login when unauthenticated). Show logged-in user + logout in the app header.
14. **등록 폼** — `src/components/PlanForm.tsx`: 5 fields, 시군구 dropdown *(now drawn from the expanded 시군구/작물 dataset)*; requires an authenticated session.
15. **경보/추천 패널** — `src/components/RiskAlertPanel.tsx`, `RecommendationCard.tsx` *(renders the ranked candidate list with per-factor score breakdown from the recommendation engine, Step 6)*.
16. **전국 비교 뷰** *(new)* — `src/components/NationwideComparison.tsx` + `src/pages/Comparison.tsx`: consumes `GET /api/comparison/nationwide` and shows all 전국 재배면적 vs 평년값 in one place — a sortable/filterable table (지역·작물·등록면적·평년값·편차%·RiskTier) plus a rollup summary (도별/작물부류별 편차, 경보 건수). This is the "한번에 보여주는" overview surface.
17. **통계 대시보드** — `src/components/PriceTrendChart.tsx`, `ProductionComparisonChart.tsx` (recharts — lightweight, 2 charts only).
18. **라우팅/페이지 조립** — replace `src/App.tsx` with a router shell; add `src/pages/{Login,Register,Map,Comparison,Dashboard}.tsx` with auth-gated routes.

## Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| KAMIS/KOSIS/MAFRA API 키 미승인으로 시드 스크립트 실행 불가 | Seed script falls back to a manually verified CSV; at least one demoScenario value is hand-verified and hardcoded if needed |
| 시군구 GeoJSON 라이선스/성능 문제 | Use a pre-simplified, license-clear open GeoJSON source; document in README |
| 대체작물 실API 어댑터가 미구현 상태로 방치 | Interface-first design — fallback path alone makes the full pipeline work; real API is a stretch goal |
| **서버 재시작 시 등록된 재배계획 소실** *(added)* | File-backed store instead of pure in-memory; seed initial plans at startup |
| **첫 로드 시 지도가 비어 보임(임팩트 저하)** *(added)* | Seed a small set of realistic initial plans, including the demoScenario combo, at server start |
| **KAMIS/KOSIS/MAFRA API 키가 프론트엔드 번들에 노출** *(added)* | Keys loaded only server-side/build-time (seed script, `server/`); never imported into `src/` client code; verified by bundle grep before demo |
| **인증 도입으로 데모 마찰 증가(로그인 벽)** *(new)* | Seed a documented demo account at startup so judges log in instantly; keep signup optional, not required to view public read-only screens |
| **비밀번호/세션 키의 안전하지 않은 저장** *(new)* | Hash passwords (bcrypt/argon2), never store plaintext; JWT/session secret server-side only, in `.env`, covered by the bundle-grep check |
| **전국 비교 뷰가 많은 행에서 렌더 성능 저하** *(new)* | Aggregate/rollup server-side in `nationwideComparison.ts`; virtualize or paginate the table; ship pre-simplified GeoJSON |
| **추천엔진 가중치가 임의로 보여 신뢰도 저하** *(new)* | Keep weights in one tunable config object, show per-factor breakdown in the UI so scores are explainable, unit-test ordering/monotonicity |

## Verification Steps
1. `npm run dev:server` + `npm run dev` together; manually walk 등록→지도→경보→추천 in browser.
2. `riskFormula.test.ts` — boundary values at ±10/20/30%.
3. demoScenario regression test — `/api/risk` always returns tier='경계' for the fixed combo.
4. Dashboard renders both charts with zero registered plans (independence check).
5. **Restart test** *(added)* — register a plan, kill and restart the server, confirm the plan is still present.
6. **Bundle key check** *(added)* — after `npm run build`, grep `dist/` for the KAMIS/KOSIS/MAFRA key strings/env var names **and the JWT/session secret**; must return zero matches.
7. **Auth flow test** *(new)* — signup → login → `GET /api/auth/me` returns the user; `POST /api/plans` without a session returns 401; passwords are stored hashed (inspect the users file — no plaintext).
8. **Nationwide comparison test** *(new)* — `GET /api/comparison/nationwide` returns every registered 시군구×작물 row with 평년값, deviation %, and RiskTier; row/rollup counts match the seeded dataset; the Comparison page renders them in one view.
9. **Diversity check** *(new)* — confirm the seeded dataset spans multiple 도/광역시 and a broad crop list, and that both the map and comparison view look populated nationwide (not a handful of combos).
10. **Recommendation ranking test** *(new)* — `/api/recommendation/:region/:crop` returns a ranked list with per-factor breakdown; ordering is deterministic for a fixed input and the source crop is excluded.

## ADR

**Decision:** Adopt a hybrid data architecture — frozen snapshot for government reference/baseline data (KAMIS/KOSIS/MAFRA), live file-backed storage for user-registered cultivation plans — served through a lightweight Express backend alongside the existing Vite+React frontend.

**Drivers:** Demo reliability under judging-day network/API uncertainty; limited development time; fidelity to the deep-interview spec's data policy and demo-scenario guarantee.

**Alternatives considered:** (B) fully live API proxying on every request — rejected, reintroduces the exact outage/approval risk the user explicitly designed around; (C) fully static/mocked with no real integration — rejected, violates the confirmed "guaranteed sources get real integration" policy.

**Why chosen:** Option A is the only one that satisfies both hard constraints simultaneously — real government data sourcing (spec fidelity) and zero live-demo network dependency (reliability) — once refined to separate the live application-state layer (registrations) from the frozen reference layer (baselines).

**Consequences:** Baseline/market-stats data will not reflect changes after the seed script runs (acceptable — it's a comparison reference, not the interactive surface). Adds a one-time seed-script maintenance burden if baseline data needs refreshing before the actual demo/submission date. Requires a small Express backend where none existed before (justified by the need for a proxy that can hold real API keys server-side and by the file-backed plan store).

**Follow-ups:** If API approvals come through with time to spare, the real-API adapter path in the recommendation module (Step 6) and a live-refresh option for baseline data become natural stretch goals — both are already designed as pluggable/optional, not required for MVP completion.

## Changelog (improvements applied from review)
- Made live-vs-snapshot data lifecycle split an explicit principle (was implicit in draft v1).
- Changed plan storage from pure in-memory to file-backed (restart-safety).
- Added initial-plan seeding at server start (avoid empty-map first load).
- Added explicit API-key handling step and a bundle-grep verification step.
- Added explicit Vite proxy config as its own sub-task in Step 1.
- Added GeoJSON simplification/licensing guidance to its own step.
- Reordered implementation steps: backend logic + demoScenario regression test moved before UI work.
- Added 3 risks and 2 verification steps surfaced by review.
- **Added user login/authentication** *(user request)* — auth routes/middleware, file-backed user store, hashed passwords, session/JWT, auth UI + gated routes; plans now record `ownerId`.
- **Promoted 대체작물 추천 from a single fallback lookup to a scored recommendation engine** *(user request)* — multi-factor weighted scoring (수익성·기후적합도·수급여유·전환용이성) returning a ranked, explainable candidate list.
- **Added a nationwide comparison view** *(user request)* — `nationwideComparison` aggregator + `GET /api/comparison/nationwide` + Comparison page showing all 전국 재배면적 vs 평년값 in one screen with 도/작물부류 rollups.
- **Broadened 시군구/도시 and 작물 diversity** *(user request)* — seed script + GeoJSON + dropdowns now cover a wide nationwide spread rather than the minimal demo set.
- Added 4 risks and 4 verification steps for the new auth, comparison, diversity, and recommendation-ranking scope.

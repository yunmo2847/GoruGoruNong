# Deep Interview Spec: 농산물 수급 불균형 해소 앱 (Agri Supply-Demand Imbalance App)

## Metadata
- Interview ID: di-agri-20260718
- Rounds: 11 (+ Round 0 topology gate)
- Final Ambiguity Score: 11.8%
- Type: greenfield
- Generated: 2026-07-18
- Threshold: 0.2 (20%)
- Threshold Source: default
- Initial Context Summarized: no (structured brief used as-is)
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 40% | 0.36 |
| Constraint Clarity | 0.88 | 30% | 0.264 |
| Success Criteria | 0.86 | 30% | 0.258 |
| **Total Clarity** | | | **0.882** |
| **Ambiguity** | | | **0.118** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|---------------------------|
| 재배계획 등록 + 지도 시각화 (registration-map) | active | 농민이 작물·지역(시군구)·면적·재배유형·시작일을 등록 → 전국 재배 현황 히트맵 | 5개 필수필드, 시군구 집계 단위로 확정 |
| 수급 불균형 예측·경보 (imbalance-alert) | active | 등록 데이터를 정부 기준재배면적/평년값과 비교해 과잉·부족 위험도 산출·경보 | 규칙기반 3단계 임계값(±10/20/30%) + 방향표시로 확정 |
| 대체작물 추천 (crop-recommendation) | active | 위험 판정된 작물 대신 재배 가능하고 수급 안정적인 대체작물 추천 | 실API 우선 시도, 실패 시 정적매핑+KAMIS가격우선순위로 폴백 |
| 지역 단위 커뮤니티 (community) | **deferred** | 지역 게시판/채팅 + 경보 자동공지 | 사용자 확정: 핵심 파이프라인에 개발 역량 집중을 위해 완전 제외, 후순위 백로그로만 기록 (2026-07-18) |
| 가격·수급 통계 대시보드 (stats-dashboard) | active | KAMIS 가격·KOSIS 생산량 통계 시각화, 등록 비의존 | 핵심 지표 2개(가격추이 차트, 생산량 vs 평년값 비교 차트)로 확정 |
| 기후·병충해 위험도 알림 (climate-pest-risk) | active | 기상·병충해·장기기후 위험도를 산출해 추천 로직에 보조 신호 제공 | MVP 포함, 단 S_weather/S_pest/S_longterm 3점수를 단일 통합 모의값으로 단순화 |

## Goal
등록(1) → 지도 히트맵(1) → 3단계 수급 위험 경보(2, ±10/20/30% 이탈, 방향 표시) → 대체작물 추천(3, 통합 기후위험 신호 보조) 으로 이어지는 단일 파이프라인을 심사위원에게 보여주는 것이 핵심 목표. 이 체인은 전량 실데이터(KAMIS/KOSIS/MAFRA 공공데이터)로 구동되며, 가격·수급 통계 대시보드(5)가 이 서사를 시간축 관점에서 보강한다. 지역 커뮤니티(4)는 이번 데모 범위에서 제외한다.

## Constraints
- 데이터 정책(원칙): KAMIS·KOSIS·MAFRA 공공데이터포털처럼 확실히 바로 쓸 수 있는 소스만 실연동. 기상청 정밀/병충해/토양 등 승인 대기 중인 API는 기본적으로 모의·정적 데이터로 대체.
- 예외: 대체작물(3)의 재배 적합성 판정은 실API(기후/토양) 연동을 우선 시도하되, 승인/시간 문제로 실패하면 지역별 정적 작물 매핑 테이블 + KAMIS 가격 기반 우선순위로 자동 폴백해야 함 — 두 경로 모두 구현 시 고려.
- 지도/통계 집계 단위는 시군구로 통일 (정부 기준재배면적/평년값 통계가 대개 시군구 단위로 공개되어, 읍면동까지 내려가면 기준데이터와 매칭 불가).
- 등록 필수 필드는 작물·지역(시군구)·면적·재배유형·시작일 5개로 제한 (그 이상 확장 금지).
- 위험도 판정은 예측모델이 아닌 규칙기반: 평년값/기준재배면적 대비 이탈률로 계산.
- 기후·병충해 위험도는 3개 세부 점수(S_weather/S_pest/S_longterm)를 별도 가중치로 계산하지 않고 단일 통합 모의값으로 단순화.
- 지역 커뮤니티 기능은 코드베이스에 구현하지 않음 (백로그 문서화만).
- 데모 신뢰성 보장: 실데이터 중 기준재배면적/평년값 대비 이탈이 큰 특정 작물×지역 조합을 사전에 "데모 시나리오"로 선별해, 라이브 데모에서 '경계' 경보와 대체작물 추천이 확실히 발동하도록 함 (라이브 등록 시연이 아닌 사전 선별 데이터 기반).

## Non-Goals
- 지역 단위 커뮤니티(게시판/채팅/경보 자동공지) 실구현 — 이번 스코프에서 명시적으로 제외.
- 병충해·장기기후 개별 API(APIHUB/AMIS/ARCCAS/NCPMS) 각각의 정밀 연동 및 개별 가중치 튜닝.
- 수급 위험도에 대한 머신러닝/통계 예측 모델(규칙기반으로 대체).
- 읍면동 단위의 세밀한 지도 해상도.

## Acceptance Criteria
- [ ] 농민이 작물·지역(시군구)·면적·재배유형·시작일 5개 필드로 재배계획을 등록할 수 있다.
- [ ] 등록된 재배계획이 시군구 단위로 집계되어 지도 위에 작물별 히트맵으로 표시된다.
- [ ] 시군구×작물 조합에 대해 등록 면적 합계와 정부 기준재배면적/평년값을 비교해 이탈률(%)이 계산된다.
- [ ] 이탈률에 따라 관심(±10%↑)/주의(±20%↑)/경계(±30%↑) 3단계로 분류되고, 과잉(+)/부족(-) 방향이 함께 표시된다.
- [ ] '경계' 단계 도달 시 경보가 발생하고 대체작물 추천이 트리거된다.
- [ ] 대체작물 추천은 (a) 실기후/토양 API 연동 시도 → (b) 실패 시 지역별 정적 작물 매핑 + KAMIS 가격 우선순위 폴백, 두 경로 모두 최소 1회 이상 동작 확인 가능하다.
- [ ] 대체작물 추천 시 통합 기후위험 모의값이 보조 신호로 반영된다 (설계상 존재 확인, 정밀도는 데모 수준).
- [ ] 통계 대시보드에 작물별 KAMIS 가격 추이 차트와 KOSIS 생산량 vs 평년값 비교 차트가 등록 데이터 없이도 표시된다.
- [ ] 지역 커뮤니티 기능은 코드/UI에 존재하지 않으며, 백로그 문서에만 명시되어 있다.
- [ ] 사전 선별된 데모 시나리오(작물×지역)로 실행 시 '경계' 단계 경보와 대체작물 추천이 매번 안정적으로 발동한다.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "심사위원에게 보여줄 킬러 장면"이 미리 정해져 있을 것 | 명시적으로 물었으나 사용자가 즉답하지 못함 | 이후 라운드(데이터 정책→위험공식→등록스키마)를 거치며 등록→히트맵→경보→추천 체인이 자연스럽게 킬러 장면으로 수렴됨 (묵시적 확정) |
| 모든 외부 API가 승인될 것이라는 가정 | API 승인 상태를 직접 질의 | 사용자도 현재 상태를 모름 → 승인 여부와 무관하게 동작하는 데이터 정책(보장 소스만 실연동, 나머지 모의)을 먼저 확정해 리스크를 무력화 |
| 수급 위험 판정에 예측모델이 필요할 것 | 예측모델 vs 규칙기반 트레이드오프 제시 | 데모 일정상 규칙기반 채택, 단 사용자가 2단계 제안을 3단계(관심/주의/경계)로 확장하고 방향(+/-) 표시까지 요구 |
| 대체작물 적합성은 정밀 기후/토양 데이터가 필요할 것 | 데모용 단순화안(정적 매핑) 제시 | 사용자는 완전한 단순화 대신 "실API 우선 시도 + 정적 매핑 폴백"의 이중 경로를 요구 — 순수 모의값보다 한 단계 더 야심찬 설계로 수정 |
| 지역 커뮤니티는 어느 정도 형태로든 MVP에 포함될 것 | MVP 포함 여부를 명시적으로 질의 | 완전 제외, 백로그로만 기록 |
| 기후·병충해 위험도는 커뮤니티처럼 통째로 제외될 수 있음 | 동일한 MVP 포함 여부 질의 | 커뮤니티와 달리 MVP에 포함하되 3점수를 단일 모의값으로 극단적으로 단순화 (완전 제외 대신 축소) |

## Technical Context
- 기술스택 미정 (인터뷰 범위 밖). 저장소(`에리카`)는 현재 수정되지 않은 Vite + React 19 + TypeScript 스타터 템플릿 상태 — 실제 기능 코드는 아직 없음.
- 외부 데이터 소스: MAFRA 기준재배면적(공공데이터포털), KAMIS 가격/평년값, KOSIS 생산량, 기상청/농진청 API(정밀 기후·병충해 — 승인 대기, 모의 대체).
- 시군구 단위가 등록·집계·위험판정·통계 전체에서 일관된 공간 단위로 사용됨 — 스키마 설계 시 이 단위를 기준 키로 사용할 것.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|----------------|
| Farmer (농민) | core domain | - | Farmer는 여러 CultivationPlan을 등록 |
| CultivationPlan (재배계획) | core domain | 작물, 지역(시군구), 면적, 재배유형, 시작일 | CultivationPlan은 하나의 Crop과 Region에 속함 |
| Crop (작물) | supporting | 이름 | Crop은 여러 지역에서 재배됨; RiskScore와 연결 |
| Region (지역, 시군구) | supporting | 시군구 코드 | Region×Crop 조합마다 RiskScore 산출 |
| RiskScore (위험도) | core domain | 이탈률(%), RiskTier(관심/주의/경계), Direction(과잉/부족) | 정부 기준재배면적·평년값 vs 등록면적 합계로 계산; 경계 단계에서 Recommendation 트리거 |
| Recommendation (대체작물추천) | core domain | 추천작물, 판정경로(실API/폴백), 기후위험보조신호 | RiskScore가 경계일 때 발동; 같은 Region 내 비위험 Crop 중 선정 |
| ClimateRiskSignal (기후위험 통합신호) | supporting | 통합 모의값 | Recommendation의 보조 입력으로만 사용 (S_weather/pest/longterm 미분리) |
| MarketStat (가격·생산량 통계) | external system | KAMIS 가격, KOSIS 생산량 | CultivationPlan과 독립적, stats-dashboard에서만 사용 |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|------------------|
| 1 | 6 | 6 | - | - | N/A |
| 2-9 | 6 | 0 | 0 | 6 | 100% |
| 10 | 8 | 2 (ClimateRiskSignal, MarketStat 명시화) | 0 | 6 | 75% |

라운드 1~9 동안 핵심 6개 엔티티(Farmer, CultivationPlan, Crop, Region, RiskScore, Recommendation)는 완전히 안정적으로 유지됨. 라운드 10에서 기후위험 신호와 시장통계를 별도 엔티티로 명시화했으나, 이는 기존 개념의 세분화이지 방향 전환이 아님 — RiskScore의 하위 속성(RiskTier, Direction)도 같은 방식으로 라운드 5에서 자연스럽게 추가됨.

## Interview Transcript
<details>
<summary>Full Q&A (10 rounds + Round 0)</summary>

### Round 0 — Topology
**Q:** 6개 컴포넌트(등록+지도, 수급경보, 대체작물추천, 지역커뮤니티, 통계대시보드, 기후병충해알림)로 읽었는데 맞습니까?
**A:** Looks right, all 6 as listed.

### Round 1 — Goal Clarity (imbalance-alert)
**Q:** 심사위원에게 보여줄 '단 하나의 킬러 장면'은 무엇입니까?
**A:** 아직 정하지 못함 / 다른 조합.
**Ambiguity:** 78.5%

### Round 2 — Constraint Clarity (cross-cutting)
**Q:** 6개 외부 API 중 지금 실제로 승인 없이 바로 쓸 수 있는 것은 몇 개입니까?
**A:** 잘 모름 / 직접 확인 필요.
**Ambiguity:** 77%

### Round 3 — Constraint Clarity (cross-cutting)
**Q:** API 승인 여부와 무관하게, 보장된 소스만 실연동하고 나머지는 모의 데이터로 대체하는 것을 기본 원칙으로 삼을까요?
**A:** 네, 그게 안전함 — 보장된 데이터만 실연동, 나머지는 모의.
**Ambiguity:** 60.5%

### Round 4 — Success Criteria (imbalance-alert)
**Q:** 위험도 판정을 규칙기반(±20% 이탈)으로 갈까요?
**A:** 규칙기반이지만 임계값은 다름 — 직접 제안해줘 → 3단계로 확장 요청.
**Ambiguity:** ~50% (중간)

### Round 5 — Success Criteria (imbalance-alert)
**Q:** ±10/20/30% 3단계 + 방향(과잉/부족) 표시로 확정할까요?
**A:** 좋아요, ±10/20/30% + 방향표시 포함.
**Ambiguity:** 49.6%

### Round 6 — Success Criteria (crop-recommendation)
**Q:** 재배 가능 판정을 정적 매핑테이블 + 비위험 필터링으로 단순화할까요?
**A:** API를 사용하는쪽으로, 안되면 정적매핑+가격우선순위(옵션2)로 폴백.
**Ambiguity:** 43.9%

### Round 7 — Goal/Constraint (community)
**Q:** 지역 커뮤니티를 데모 범위에 어떻게 담을까요?
**A:** 완전 제외, 후순위 백로그로만 기록.
**Ambiguity:** 37.8%

### Round 8 — Success Criteria (registration-map)
**Q:** 지도 집계 단위 시군구 + 5개 필수필드(작물/지역/면적/재배유형/시작일)로 확정할까요?
**A:** 좋아요, 시군구 단위 + 5개 필수필드 확정.
**Ambiguity:** 30.4%

### Round 9 — Success Criteria (stats-dashboard)
**Q:** 대시보드 핵심 지표를 가격추이+생산량비교 2개로 확정할까요?
**A:** 좋아요, 가격추이+생산량비교 2개로 확정.
**Ambiguity:** 23.6%

### Round 10 — Goal/Constraint (climate-pest-risk)
**Q:** 기후·병충해 위험도 기능을 MVP에 포함할까요? 포함한다면 어떻게 단순화할까요?
**A:** MVP에 포함, 하지만 3개 점수를 하나로 통합(단순 모의값).
**Ambiguity:** 15% ✅ (threshold met)

### Round 11 — Success Criteria (imbalance-alert + crop-recommendation, demo reliability)
**Q:** 데모 당일 실데이터가 평범해서 '경계' 단계가 안 뜨는 상황을 어떻게 방지할까요?
**A:** 특정 작물·지역을 '데모 시나리오'로 미리 선별.
**Ambiguity:** 11.8% (user opted to continue past threshold for extra clarity)

</details>

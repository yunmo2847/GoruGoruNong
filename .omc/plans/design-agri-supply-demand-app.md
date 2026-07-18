# Design Spec: 농산물 수급 불균형 해소 앱

Companion to `plan-agri-supply-demand-app.md`. This document defines the UI/UX design — visual language, information architecture, per-screen layout, and states — for the 5 active components plus the added 로그인 · 대체작물 추천엔진 · 전국 비교 뷰 features.

Status: **design draft** (follows the approved plan's scope; no new features introduced here)

---

## 1. Design Principles

1. **파이프라인이 곧 화면 흐름** — the app tells one story: 로그인 → 재배계획 등록 → 지도에서 위험 확인 → 경보 → 대체작물 추천. Navigation should make this sequence obvious, not bury it under a flat menu.
2. **RiskTier 색은 신호이지 장식이 아니다** — the 4-tier color scale (정상/관심/주의/경계) is the app's core visual signal and is used *consistently* on the map, badges, table rows, and charts. Nowhere else may reuse those hues for decoration.
3. **한눈에(at a glance) 먼저, 상세는 그 다음** — every data screen leads with a summary (경보 건수, 도별 편차 rollup) before the row-level detail. The 전국 비교 뷰 is the flagship "한번에 보여주는" surface.
4. **데이터 신뢰가 보여야 한다** — show data provenance (KAMIS/KOSIS/MAFRA, 평년값 기준연도) and "as of" timestamps so judges trust the numbers. Recommendation scores show their factor breakdown — no black-box ranking.
5. **로그인은 벽이 아니라 문** — auth adds ownership, not friction. Public read-only screens (지도·전국 비교) are viewable; only 등록/개인화 requires login. A seeded demo account gets judges in instantly.

---

## 2. Design Tokens

### 2.1 Color

**RiskTier scale (locked by the plan — do not restyle):**

| Tier | 의미 | Fill | Text-on-fill | Border/emphasis |
|------|------|------|--------------|-----------------|
| 정상 | baseline 근접 | `#9CA3AF` (회색) | `#111827` | `#6B7280` |
| 관심 | ±10% 초과 | `#FDE68A` (연노랑) | `#78350F` | `#F59E0B` |
| 주의 | ±20% 초과 | `#FB923C` (주황) | `#431407` | `#EA580C` |
| 경계 | ±30% 초과 | `#EF4444` (빨강) | `#FFFFFF` | `#B91C1C` |

- Direction is encoded separately from tier: **▲ 과잉(+)** vs **▼ 부족(−)**, shown as an arrow/icon so color isn't the only cue (accessibility).

**Brand / neutral (not RiskTier):**

| Role | Light | Dark |
|------|-------|------|
| Primary (브랜드/CTA) | `#15803D` (농업 그린) | `#22C55E` |
| Background | `#F8FAF9` | `#0B0F0E` |
| Surface/card | `#FFFFFF` | `#151A18` |
| Text primary | `#111827` | `#F3F4F6` |
| Text muted | `#6B7280` | `#9CA3AF` |
| Border | `#E5E7EB` | `#26302C` |

> Primary green is intentionally distinct from the RiskTier "정상 회색" so a CTA is never confused with a status.

### 2.2 Typography

- Font: system UI stack + `Pretendard`/`Noto Sans KR` fallback for Korean.
- Scale: `12 / 14 / 16(base) / 20 / 24 / 32`. Numbers in tables/KPIs use `font-variant-numeric: tabular-nums` for column alignment.
- Weight: 400 body, 600 labels/headers, 700 KPI figures.

### 2.3 Spacing & Radius

- 4px base grid → `4 / 8 / 12 / 16 / 24 / 32 / 48`.
- Radius: `8px` inputs/cards, `12px` panels, full-round for badges.
- Shadow: single soft elevation for cards; map/table containers are flat with a border.

---

## 3. Information Architecture & Navigation

```
App shell (header: 로고 · 전역 nav · 로그인 상태/logout)
├── /login            공개  — 로그인/회원가입 (데모 계정 안내)
├── /                 공개  — 전국 비교 뷰 (기본 랜딩, "한번에 보여주는" overview)
├── /map              공개  — 지도(히트맵) + 경보
├── /register         보호  — 재배계획 등록 (로그인 필요)
├── /dashboard        공개  — 통계 대시보드 (가격추이 · 생산 vs 평년값)
└── /recommendation/:region/:crop  — 대체작물 추천 (경보/지도에서 진입)
```

- **Header nav**: 전국비교 · 지도 · 등록 · 대시보드. 보호 라우트(등록)는 미로그인 시 클릭하면 `/login`으로 redirect 후 복귀.
- **Primary flow entry**: 지도/전국비교의 '경계' 항목 → 경보 패널 → "대체작물 보기" CTA → 추천 화면. This is the demo's climax path and must be one click from a red cell.
- Header always shows current user (`홍길동 님`) + logout, or a "로그인" button.

---

## 4. Screen Designs

### 4.1 로그인 / 회원가입 (`/login`)

- Centered card (max-width 400px). Tabs or toggle: **로그인 / 회원가입**.
- Fields: 이메일, 비밀번호 (+ 이름 on signup). Inline validation, show/hide password toggle.
- **데모 계정 안내 박스**: seeded credentials shown for judges (`demo@… / ****`) with a "데모 계정으로 로그인" one-click button.
- Errors surface as a field-level or top-of-form message (401 → "이메일 또는 비밀번호가 올바르지 않습니다").
- Never reflect whether an email exists differently on login failure (avoid user enumeration).

### 4.2 전국 비교 뷰 (`/`, flagship)

Layout, top → bottom:

1. **Summary rollup band** (KPI row): 총 등록 지역 수 · 경보 건수(경계/주의/관심) · 최대 편차 작물 · 데이터 기준연도. Each KPI is a stat tile; 경보 건수 tiles use RiskTier colors.
2. **Rollup 시각화**: 도(道)별 또는 작물부류별 편차를 보여주는 가로 막대(편차 %)  — 한눈에 어디가 과잉/부족인지.
3. **전국 비교 테이블** (핵심): columns = 지역(시군구) · 작물 · 등록면적 · 평년값 · 편차% · 방향(▲/▼) · RiskTier badge. 
   - Sortable per column, filter chips (도, 작물부류, Tier).
   - Row's left border colored by RiskTier; badge in the Tier column. Row click → 해당 지역·작물 상세/추천으로 이동.
   - Large dataset → server-side aggregation + table virtualization/pagination (plan Risk 참조).
- This screen embodies "전국의 모든 재배면적을 평년값과 비교해 한번에" — table + rollup together.

### 4.3 지도 / 히트맵 (`/map`)

- Full-width choropleth (시군구 GeoJSON). Fill = RiskTier color of the dominant/selected crop's deviation.
- **Crop selector** (드롭다운/칩): 지도가 특정 작물 기준으로 색칠되도록. Default = demoScenario crop.
- **Legend**: 4-tier scale + ▲/▼ direction, fixed bottom-left.
- Hover tooltip: 시군구명 · 작물 · 등록면적 · 평년값 · 편차% · Tier. Click → 경보 패널(오른쪽 사이드) 오픈.
- **경보 패널 (RiskAlertPanel)**: 선택 지역의 Tier 배지 + 편차 설명 + "대체작물 추천 보기" primary CTA.
- 성능: pre-simplified GeoJSON; SVG choropleth or leaflet.

### 4.4 대체작물 추천 (`/recommendation/:region/:crop`)

- Header: "○○시 △△ 과잉(경계) — 대체작물 추천".
- **RecommendationCard 리스트 (ranked)**: each candidate crop as a card/row showing:
  - Rank + 작물명 + **총점**(0–100 or 상대 게이지).
  - **Per-factor breakdown**: 수익성 · 기후적합도 · 수급여유 · 전환용이성 as mini bars or a small radar — makes the score explainable (plan Risk 참조).
  - Source badge: 실API 적합도 or 정적매핑+KAMIS 가격 (fallback 표시).
- Excludes the source crop; climate-incompatible candidates hidden or greyed with reason.
- Weights are engine-config; UI just renders the breakdown.

### 4.5 재배계획 등록 (`/register`, 보호)

- `PlanForm`: 5 fields — 시군구(dropdown, 확장된 전국 목록) · 작물(dropdown, 확장된 목록) · 재배면적 · 예상 정식/수확시기 · (spec의 5번째 필드).
- Live 검증: 시군구 code는 `sigungu.json` 대조. Submit 시 → 성공 토스트 + 지도/전국비교로 이동 유도.
- 미로그인 접근 → `/login` redirect. 제출된 계획은 `ownerId`로 소유.

### 4.6 통계 대시보드 (`/dashboard`)

- Two charts only (recharts): **가격추이**(line) · **생산량 vs 평년값**(grouped bar/area).
- Each chart in its own card with title + 데이터 출처/기준연도 caption.
- Renders correctly with **zero registered plans** (independence — plan Verification #4).

---

## 5. Component Inventory (design-level)

| Component | Role | Key states |
|-----------|------|-----------|
| `AppHeader` | nav + auth status | logged-in / logged-out |
| `RiskBadge` | Tier + direction chip | 정상/관심/주의/경계 × ▲/▼ |
| `StatTile` | KPI figure | neutral / tier-colored |
| `NationwideTable` | 전국 비교 표 | loading / empty / sorted / filtered |
| `HeatmapMap` | choropleth | loading / no-data 시군구 |
| `RiskAlertPanel` | 지역 경보 + CTA | tier variants |
| `RecommendationCard` | ranked 후보 | live-API / fallback source |
| `PlanForm` | 등록 폼 | validating / error / success |
| `AuthForm` | 로그인·회원가입 | error(401) / loading |
| Charts | 대시보드 | zero-data / populated |

---

## 6. Cross-cutting States

- **Loading**: skeletons for table rows/cards; a subtle spinner for the map. Never a blank white screen.
- **Empty**: 전국 비교/지도가 비지 않도록 서버가 초기 계획을 시드(plan Step 9). 그래도 빈 경우 "등록된 재배계획이 없습니다 — 등록하기" CTA.
- **Error**: API 실패 시 카드 내 인라인 오류 + 재시도 버튼. Recommendation은 자동 fallback이므로 사용자에겐 오류 대신 source 배지로 표시.
- **As-of / provenance**: 모든 데이터 화면 하단에 출처 + 기준연도/스냅샷 시각.

---

## 7. Accessibility

- RiskTier는 색+아이콘(▲/▼)+텍스트 3중 인코딩 — 색각 이상 사용자 대응. 색만으로 상태를 전달하지 않는다.
- 대비: text-on-fill 값은 위 표 기준 WCAG AA 목표. '경계' 빨강 위 텍스트는 흰색.
- 키보드: 폼·테이블 정렬·지도 지역 선택 모두 tab/enter 가능. 포커스 링 유지.
- 모든 인터랙티브 아이콘에 `aria-label`; 지도 tooltip은 텍스트로도 접근 가능.

---

## 8. Responsive

- **Desktop(≥1024)**: 지도 + 사이드 경보 패널 나란히; 전국 비교는 full 테이블 + rollup.
- **Tablet(768–1023)**: 경보 패널이 지도 아래로; 테이블 가로 스크롤.
- **Mobile(<768)**: 단일 컬럼; 테이블은 카드 리스트로 축약(지역·작물·Tier·편차 우선), 나머지 컬럼은 확장 토글. 헤더 nav는 햄버거.

---

## 9. Motion (절제)

- Tier 색 전환·차트 진입은 150–250ms ease-out. 지도 선택 하이라이트만 강조.
- 과한 애니메이션 금지 — 신뢰가 핵심인 데이터 앱. 로딩 skeleton → content는 fade only.

---

## 10. Open Design Questions

- 지도 색칠 기준: 작물 선택형(현안) vs "가장 심각한 Tier" 집계형 — 데모에선 작물 선택형이 스토리에 유리.
- 전국 비교 뷰의 rollup 축: 도별 vs 작물부류별 중 기본값 — 사용성 테스트로 확정.
- 추천 점수 표기: 절대 점수(0–100) vs 상대 랭크 게이지 — 판단 근거 전달력 기준으로 택1.

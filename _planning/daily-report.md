# Daily Report (일별 리포트) — 기획 문서

> **참고:** `_docs/MIGRATION_ANALYSIS.md` 및 `_reference/features/reports/` 레퍼런스 코드를 기준으로, Next.js App Router·React 패턴에 맞춰 일별 리포트 마이그레이션 범위와 TO-BE 구조를 정리했습니다.  
> 규칙: `00-project-main.mdc`(기획 선 작성 → 확인 후 구현), `40-data-main-rule.mdc`(client_id 문자열), `31-term-main.mdc`(날짜·공휴일), `02-project-migration.mdc`(레퍼런스 준수).

---

## 1. 목표와 범위

### 1.1 목표

- **AS-IS:** 바닐라 TS 리포트 Feature의 **일별( Daily )** 화면만 우선 마이그레이션.
- **TO-BE:** `app/(dashboard)/reports/daily/` 페이지에서 일별 리포트를 제공하고, 데이터 로딩·필터·정렬·상태 카드·테이블을 React/Next.js 패턴으로 동작시키기.

### 1.2 범위 (이번 기획에 포함)

| 항목 | 설명 |
|------|------|
| **페이지** | `/reports/daily` — 일별 리포트 전용 페이지 |
| **데이터** | `ads.daily` 기반 최근 14일, 공휴일(`ads.ref_holiday` 또는 `shared`), 클라이언트별 일별 금액·전일비교·평균비교 |
| **UI** | 상태 카드(Active / New / Stopped / Rising / Falling), 검색·담당자·상태 필터, 정렬 가능 테이블(헤더+합계행+클라이언트 행) |
| **동작** | 상태 카드 클릭 시 해당 상태로 필터, 검색/담당자/상태 변경 시 테이블만 클라이언트에서 재계산·재렌더 |

### 1.3 범위 외 (별도 기획)

- 주간 리포트(Weekly) — `3.2.2 Weekly report`에서 진행.
- 리포트 공통 레이아웃(`reports/layout.tsx`)은 데일리 구현 시 필요한 최소만(예: 탭/링크) 반영 가능.

---

## 2. AS-IS 요약 (레퍼런스)

### 2.1 진입점 및 구조

- **진입:** `features/reports/index.ts` → `initReportsPage()` 시 Daily/Weekly 탭 중 활성에 따라 `loadDailyReport()` 또는 `loadWeeklyReport()` 호출.
- **일별 전용:** `lib/daily/load.ts` → `runReportLoad()` 로 **fetch → status 계산 → 필터 → 정렬 → 테이블/헤더 렌더** 파이프라인 실행.
- **DOM:** `StatusCards`, `ReportFilters`, `ReportTable` 클래스가 특정 ID(`daily-report-tbody`, `daily-report-thead`, `daily-search-input`, `daily-manager-filter`, `daily-status-filter`, `summary-*-count` 등)를 가진 DOM을 생성·갱신.

### 2.2 데이터 흐름

1. **fetch:** `fetchDailyReportData()` → `report-api`: `fetchLastReportDate`, `fetchHolidaysInRange`, `fetchDailyReportRows` (레퍼런스는 `ads_data_daily`, `shared_holiday`).
2. **비즈니스:** 최근 14일 `dateRange`, 클라이언트별 `amounts: Map<date, number>`, 전일 비교·평균 비교·증감 계산 후 `DailyReportRow[]` + `holidays: Set<string>` 반환.
3. **캐시:** 결과를 `window.dailyReportDataCache`에 저장하고, 필터/정렬 변경 시 `filterDailyReportTable()`에서 캐시 기반으로 재필터·재정렬·테이블만 다시 그리기.

### 2.3 필터·정렬

- **필터:** 상태(active/new/stopped/rising/falling), 검색(Client ID·이름), 담당자(select). `applyDailyFilters()`에서 DOM에서 값 읽어 필터링.
- **정렬:** 컬럼별 클릭 시 `dailySortState` 갱신 후 `sortDailyClients()` 적용, 헤더 아이콘 갱신.

### 2.4 상태 카드

- **계산:** `calculateDailyStatus(clients, dateRange)` → Active(어제/오늘), New, Stopped, Rising, Falling.
- **표시:** `updateDailyStatusCards(statusData)` → `summary-active-count`, `summary-new-count`, `summary-new-amount` 등 ID 요소에 텍스트 주입.
- **클릭:** 카드 클릭 시 해당 상태로 `daily-status-filter` 값 설정 후 테이블 재필터(공통 `setupStatusCardClickHandlers`).

---

## 3. TO-BE 구조 (Next.js / React)

### 3.1 폴더 및 파일 배치

```
app/(dashboard)/reports/
├── layout.tsx                    # (선택) 공통 레이아웃·탭 링크 — 미구현
├── daily/
│   ├── page.tsx                  # ✅ 일별 리포트 페이지 (Server Component 루트)
│   ├── DailyReportClient.tsx     # ✅ Client 래퍼 (정렬 state, 목 데이터 → 테이블)
│   └── mock-daily-data.ts        # ✅ 목 데이터 (실 API 연동 전)
├── daily-report-data.ts          # (기존) 제거 또는 lib로 이동 후 정리 — 미사용
├── types.ts                      # (기존) 주간 타입 등 — 데일리 테이블은 lib/features/reports/daily-types 사용
└── ...

components/features/reports/
├── ReportFilters.tsx             # 🔲 검색 + 담당자 (일별) — 미구현
├── StatusCards.tsx               # 🔲 5개 상태 카드 — 미구현
└── DailyReportTable.tsx          # ✅ 일별 테이블 (헤더·합계·본문·정렬)

lib/
├── api/
│   ├── daily.ts                  # (기존) getLatestDateFromDb ✅
│   └── reports.ts                # 🔲 fetchHolidaysInRange, fetchDailyReportRows (ads 스키마) — 미구현
├── features/reports/
│   ├── daily-types.ts            # ✅ DailyReportRow(client_id string), SortState
│   ├── daily-summary.ts          # ✅ buildDailySummary (합계행 계산)
│   ├── daily-sort.ts             # ✅ cycleSortState, sortDailyClients
│   ├── daily-status.ts           # 🔲 calculateDailyStatus — 미구현
│   └── daily-filters.ts          # 🔲 applyDailyFilters (상태/검색/담당자) — 미구현
└── utils/
    └── date-utils.ts             # ✅ getRecentDateRange (기존)
```

- **데이터 fetching:** Server에서 실행. `page.tsx`는 async로 `fetchDailyReportData()`(또는 `lib/api/reports.ts`에서 export) 호출 후 자녀에게 props로 전달.
- **필터/정렬/상태 카드 클릭:** Client Component에서 `useState`(또는 URL searchParams)로 관리하고, 캐시된 전체 데이터에서 파생 데이터만 계산해 테이블에 넘김. (초기 로드는 Server, 이후 재필터/재정렬은 클라이언트.)

### 3.2 페이지·컴포넌트 역할

| 아티팩트 | 타입 | 역할 |
|----------|------|------|
| `reports/daily/page.tsx` | Server Component | `fetchDailyReportData()` 호출, 로딩/에러 처리, Client 래퍼에 `result`(clients, dateRange, holidays) 전달 |
| `ReportFilters.tsx` | Client | 검색어, 담당자, 상태 필터 상태 보유; 변경 시 부모에 콜백 또는 URL 갱신 |
| `StatusCards.tsx` | Client | `DailyStatusData` 표시; 카드 클릭 시 상태 필터 값 설정 후 테이블 재계산 유도 |
| `DailyReportTable.tsx` | Client | 정렬 상태·필터된 목록 받아 헤더·합계행·본문 렌더; 컬럼 클릭 시 정렬 상태 변경 |

### 3.3 데이터·API

- **테이블:** 이 프로젝트는 `ads` 스키마 사용. `ads.daily`, `ads.ref_holiday`(또는 문서에 따른 공휴일 테이블) 사용.
- **client_id:** 모든 타입·API에서 **문자열** (`40-data-main-rule`).
- **일별 API (lib/api/reports.ts 또는 기존 daily 확장):**
  - 최신일: `getLatestDateFromDb()` (기존 `lib/api/daily.ts`) 재사용.
  - **dateRange:** `getRecentDateRange(lastDate, 14)` (`@/lib/utils/date-utils`) 로 최근 14일 배열 생성. DB에서 “최근 n일” 뽑는 로직은 date-utils에만 두기.
  - `fetchHolidaysInRange(supabase, dateRange)` → 공휴일 목록 반환 (`ads.ref_holiday` 등).
  - `fetchDailyReportRows(supabase, dateRange)` → `ads.daily`에서 해당 기간 `client_id, client_name, manager_id, date, amount` 페이지네이션·병렬 조회.
- **날짜 범위 (dateRange):** DB 최신일 1건 조회 후, **`lib/utils/date-utils.ts`** 의 `getRecentDateRange(endDate, n)` 으로 최근 n일 배열 생성 (예: 14일). 리포트 데이터 레이어에서는 이 유틸만 사용하고, 날짜 루프/가감 로직은 date-utils에 두기.
- **비즈니스 로직:** 레퍼런스 `daily-report-data.ts`의 clientMap·전일/평균 비교 계산을 그대로 옮기되, `client_id`는 **string**으로 통일. `DailyReportDataResult`(clients, dateRange, holidays) 반환.

### 3.4 타입 (types.ts 등)

- `DailyReportRow`: `client_id: string`, `client_name`, `manager_id`, `amounts: Map<string, number>`, `mostRecentAmount`, `changeAmount`, `dayBeforeRatio`, `dayBeforeValue`, `avgRatio`, `avgValue`.
- `DailyReportDataResult`: `clients: DailyReportRow[]`, `dateRange: string[]`, `holidays: Set<string>`.
- `DailyStatusData`: 레퍼런스 `lib/types.ts`와 동일 구조 (active.today/yesterday, new, stopped, rising, falling).
- `SortState`: `{ column: string; order: 'asc' | 'desc' | null }`.

---

## 4. 마이그레이션 매핑 (MIGRATION_ANALYSIS 10.8 반영)

| AS-IS (레퍼런스) | TO-BE |
|------------------|--------|
| `features/reports/index.ts` (Daily 탭 로드) | `app/(dashboard)/reports/daily/page.tsx` |
| `features/reports/lib/daily/load.ts` | Server에서 `fetchDailyReportData` 호출 + Client에서 필터/정렬 파이프라인 |
| `features/reports/lib/daily-report-data.ts` | `lib/api/reports.ts` + `lib/features/reports/` 쪽 순수 계산 (client_id string) |
| `shared/api/report-api.ts` (일별 부분) | `lib/api/reports.ts` (ads.daily, ads.ref_holiday) |
| `features/reports/lib/daily/status.ts` | `lib/features/reports/daily-status.ts` |
| `features/reports/lib/daily/filters.ts` | `lib/features/reports/daily-filters.ts` (DOM 제거, 인자 기반) |
| `features/reports/lib/daily/sort.ts` | `lib/features/reports/daily-sort.ts` (상태는 React state로) |
| `features/reports/lib/daily/table.ts` | `components/features/reports/DailyReportTable.tsx` (JSX) |
| `features/reports/lib/daily/filter-table.ts` | Client 쪽에서 필터/정렬 state로 파생 목록 계산 후 테이블에 전달 |
| `features/reports/lib/daily/events.ts` | ReportFilters / StatusCards 내부 이벤트 핸들러 |
| `features/reports/components/StatusCards/` | `components/features/reports/StatusCards.tsx` |
| `features/reports/components/ReportFilters/` | `components/features/reports/ReportFilters.tsx` |
| `features/reports/components/ReportTable/` | `components/features/reports/DailyReportTable.tsx` |
| `window.dailyReportDataCache` | Server에서 받은 `result`를 Client 상태 또는 Context로 보관 (필터/정렬 시 재사용) |

---

## 5. 구현 현황

이 섹션은 Daily Report 구현 아티팩트를 **재사용 가능성 및 범위**에 따라 분류합니다.

### 5.1 앱 전역 공통 (App-wide Shared)

전체 앱에서 재사용 가능한 유틸리티 및 인프라.

| 항목 | 경로 | 상태 | 비고 |
|------|------|------|------|
| **날짜 유틸** | `lib/utils/date-utils.ts` | ✅ 완료 | `normalizeDate`, `getRecentDateRange` — 31-term-main 준수 |

### 5.2 리포트 공통 (Reports Shared)

Daily와 Weekly 리포트가 공통으로 사용하는 타입, 로직, 컴포넌트.

#### 5.2.1 타입 및 인터페이스

| 항목 | 경로 | 상태 | 비고 |
|------|------|------|------|
| **정렬 타입** | `lib/features/reports/daily-types.ts` | ✅ 완료 | `SortState`, `SortOrder` — Daily/Weekly 공통 사용 가능 |
| **상태 데이터 타입** | `app/(dashboard)/reports/types.ts` | ⚠️ 레거시 참조 | `DailyStatusData`, `WeeklyStatusData` — 레퍼런스와 동일. `lib/features/reports/` 이동 고려 |

**권장 정리:**
- `SortState`, `SortOrder` → `lib/features/reports/shared-types.ts` (또는 `common-types.ts`)
- `DailyStatusData`, `WeeklyStatusData` → 동일 파일에 통합
- `app/(dashboard)/reports/types.ts`는 페이지 레벨 타입만 남기거나 제거

#### 5.2.2 순수 로직 (Pure Functions)

| 항목 | 경로 | 상태 | 비고 |
|------|------|------|------|
| **검색 필터** | `app/(dashboard)/reports/search-filter.ts` | ⚠️ 레거시 참조 | `applySearchFilter<T>` — 제네릭 순수 함수. `lib/features/reports/` 이동 권장 |
| **담당자 필터** | `app/(dashboard)/reports/manager-filter.ts` | ⚠️ 레거시 참조 | `getClientIdsByManagerFilter` — DOM 의존 제거 필요. `lib/api/` 또는 `lib/features/reports/` 이동 |

**권장 정리:**
- `applySearchFilter` → `lib/features/reports/shared-filters.ts`
- `getClientIdsByManagerFilter` → `lib/api/reports.ts` (또는 `lib/features/reports/manager-utils.ts`), DOM 의존(`loadManagerListIntoSelect`) 제거

#### 5.2.3 레퍼런스에서 활용 가능한 공통 로직

레퍼런스 폴더에 있는 파일 중 Daily/Weekly 공통으로 사용 가능:

| 레퍼런스 파일 | 내용 | 마이그레이션 권장 경로 | 비고 |
|-------------|------|---------------------|------|
| `_reference/features/reports/lib/shared/search-filter.ts` | `applySearchFilter<T>` | `lib/features/reports/shared-filters.ts` | 이미 `app/(dashboard)/reports/search-filter.ts`에 복사됨. `lib/`로 이동 필요 |
| `_reference/features/reports/lib/shared/manager-filter.ts` | `loadManagerListIntoSelect`, `getClientIdsByManagerFilter` | `lib/api/managers.ts` + `lib/features/reports/manager-utils.ts` | DOM 로직(`loadManagerListIntoSelect`)은 React 컴포넌트로, 순수 로직(`getClientIdsByManagerFilter`)은 `lib/`로 분리 |
| `_reference/features/reports/lib/common.ts` | `showSkeletonLoading` | ❌ 사용 안 함 | DOM 기반 스켈레톤 로직 — Next.js에서는 Suspense + Skeleton 컴포넌트 사용 |
| `_reference/features/reports/lib/types.ts` | `DailyStatusData`, `WeeklyStatusData`, `SortState` | `lib/features/reports/shared-types.ts` | 이미 `app/(dashboard)/reports/types.ts`에 있음. `lib/`로 이동 |

**레퍼런스 활용 전략:**
1. **검색·담당자 필터** — 순수 함수 부분만 추출, React 패턴으로 전환
2. **타입** — 공통 타입을 `lib/features/reports/shared-types.ts`에 통합
3. **Skeleton UI** — 사용 안 함 (Next.js Suspense + Shadcn Skeleton 사용)

### 5.3 일별 리포트 전용 (Daily-specific)

Daily Report에서만 사용하는 타입, 로직, 컴포넌트.

#### 5.3.1 구현 완료

| 항목 | 경로 | 비고 |
|------|------|------|
| **일별 데이터 타입** | `lib/features/reports/daily-types.ts` | `DailyReportRow`(client_id **string**), `DailyReportDataResult` |
| **일별 테이블** | `components/features/reports/DailyReportTable.tsx` | 헤더(정렬 가능), 합계행, 클라이언트 행, 전일/평균 비교·증감·날짜별 금액, 공휴일·주말 강조 |
| **합계행 계산** | `lib/features/reports/daily-summary.ts` | `buildDailySummary(clients, dateRange)` — 순수 함수 |
| **정렬 로직** | `lib/features/reports/daily-sort.ts` | `cycleSortState`, `sortDailyClients` — 순수 함수 |
| **일별 페이지** | `app/(dashboard)/reports/daily/page.tsx` | Server Component 루트 |
| **Client 래퍼** | `app/(dashboard)/reports/daily/DailyReportClient.tsx` | 정렬 state 관리, 테이블 렌더 |
| **목 데이터** | `app/(dashboard)/reports/daily/mock-daily-data.ts` | 실 API 연동 전 임시 데이터 |

#### 5.3.2 구현 예정 (우선순위 순)

| 순서 | 항목 | 경로/내용 |
|------|------|-----------|
| 1 | **공통 타입·필터 정리** | `lib/features/reports/shared-types.ts`, `shared-filters.ts` 생성. `app/(dashboard)/reports/` 내 레거시 파일 정리 또는 제거. |
| 2 | **일별 API** | `lib/api/reports.ts`: `fetchHolidaysInRange`, `fetchDailyReportRows` (ads 스키마). 최신일은 `getLatestDateFromDb()` 재사용, dateRange는 `getRecentDateRange(lastDate, 14)` 사용. |
| 3 | **일별 데이터 집계** | `lib/api/reports.ts` 또는 `lib/features/reports/daily-data-builder.ts`: DB 원시 행 → clientMap·전일/평균 비교 계산 → `DailyReportDataResult` 반환 (client_id string). 레퍼런스 `_reference/features/reports/lib/daily-report-data.ts` 참조. |
| 4 | **상태 계산** | `lib/features/reports/daily-status.ts`: `calculateDailyStatus(clients, dateRange)` → `DailyStatusData`. 레퍼런스 `_reference/features/reports/lib/daily/status.ts` 참조. |
| 5 | **필터 로직** | `lib/features/reports/daily-filters.ts`: 상태/검색/담당자 필터 (인자 기반, DOM 없음). 레퍼런스 `_reference/features/reports/lib/daily/filters.ts` 참조. |
| 6 | **StatusCards** | `components/features/reports/StatusCards.tsx`: `DailyStatusData` 표시, 카드 클릭 시 상태 필터 연동. 레퍼런스 `_reference/features/reports/components/StatusCards/` 참조. |
| 7 | **ReportFilters** | `components/features/reports/ReportFilters.tsx`: 검색·담당자·상태 select, 부모에 변경 전달. 레퍼런스 `_reference/features/reports/components/ReportFilters/` 참조. |
| 8 | **Server 데이터 로딩** | `page.tsx`에서 async `fetchDailyReportData()` 호출, 로딩/에러 UI, Client 래퍼에 result 전달. 목 데이터 제거. |
| 9 | **페이지 조합** | `DailyReportClient`에서 필터/정렬 state + 전체 데이터로 파생 목록 계산 후 테이블·카드에 전달. |

### 5.4 레거시 정리 대상 (Clean-up Required)

`app/(dashboard)/reports/` 내부에 레퍼런스 파일이 혼재되어 있음. 다음 파일들은 정리 필요:

| 파일 | 현재 위치 | 정리 방향 |
|------|----------|----------|
| `daily/data.ts`, `daily/events.ts`, `daily/filter-table.ts`, `daily/filters.ts`, `daily/load.ts`, `daily/sort.ts`, `daily/status.ts`, `daily/table.ts` | `app/(dashboard)/reports/daily/` | ❌ **레퍼런스 파일** — 삭제 또는 `_reference-backup/`로 이동. 마이그레이션은 `lib/` 또는 `components/`로 새로 생성. |
| `weekly/` 하위 모든 파일 | `app/(dashboard)/reports/weekly/` | ❌ **레퍼런스 파일** — 주간 리포트 구현 시까지 보관 또는 `_reference-backup/`로 이동. |
| `ReportFilters/`, `ReportTable/`, `StatusCards/` | `app/(dashboard)/reports/` | ❌ **레거시 클래스 컴포넌트** — `components/features/reports/`에 React 컴포넌트로 재작성. |
| `common.ts`, `search-filter.ts`, `manager-filter.ts` | `app/(dashboard)/reports/` | ⚠️ **공통 로직** — `lib/features/reports/shared-*.ts`로 이동 후 제거. |
| `types.ts`, `daily-report-data.ts`, `weekly-report-data.ts` | `app/(dashboard)/reports/` | ⚠️ **타입/데이터** — `lib/features/reports/`로 이동 후 제거. |
| `run-report-load.ts` | `app/(dashboard)/reports/` | ❌ **레거시 로더** — 삭제 (Next.js App Router에서 불필요). |

**권장 정리 순서:**
1. 공통 로직(`search-filter.ts`, `manager-filter.ts`, `types.ts`) → `lib/features/reports/shared-*.ts`로 이동
2. Daily 전용 로직(`daily-report-data.ts` 등) → `lib/features/reports/daily-*.ts` 또는 `lib/api/reports.ts`로 통합
3. 레퍼런스 파일(`daily/data.ts` 등) → `_reference-backup/`로 이동 또는 삭제
4. 레거시 클래스 컴포넌트(`ReportFilters/`, `ReportTable/`, `StatusCards/`) → React 컴포넌트 완성 후 삭제

### 5.5 주간 리포트 재사용 가능 항목 (For Weekly Report)

주간 리포트 구현 시 재사용 가능한 공통 아티팩트:

| 항목 | 경로 | 주간 리포트 재사용 방식 |
|------|------|---------------------|
| **정렬 타입** | `lib/features/reports/shared-types.ts` (이동 후) | 동일 `SortState`, `SortOrder` 사용 |
| **검색 필터** | `lib/features/reports/shared-filters.ts` (이동 후) | `applySearchFilter<WeeklyReportRow>` 호출 |
| **담당자 필터** | `lib/api/reports.ts` (이동 후) | `getClientIdsByManagerFilter` 재사용 |
| **날짜 유틸** | `lib/utils/date-utils.ts` | 주 단위 계산 추가 가능 (예: `getRecentWeekRange`) |
| **StatusCards** | `components/features/reports/StatusCards.tsx` (구현 후) | `WeeklyStatusData` props로 재사용 (제네릭화 고려) |
| **ReportFilters** | `components/features/reports/ReportFilters.tsx` (구현 후) | 동일 필터 UI 재사용 |

---

## 6. 구현 순서 제안 (참고)

### Phase 1: 공통 인프라 정리 (Clean-up & Refactor)

**목표:** 레거시 파일 정리, 공통 로직을 `lib/`로 이동하여 재사용 가능한 구조 확립.

1. **공통 타입 통합**
   - `lib/features/reports/shared-types.ts` 생성
   - `SortState`, `SortOrder`, `DailyStatusData`, `WeeklyStatusData` 통합
   - `app/(dashboard)/reports/types.ts` 제거 또는 페이지 레벨 타입만 남기기

2. **공통 필터 로직 이동**
   - `lib/features/reports/shared-filters.ts` 생성
   - `applySearchFilter<T>` 이동 (`app/(dashboard)/reports/search-filter.ts`에서)
   - `app/(dashboard)/reports/search-filter.ts` 제거

3. **담당자 관련 로직 분리**
   - `lib/api/managers.ts`: `getManagerList`, `getClientIdsByManagerFilter` (DB 호출)
   - DOM 로직(`loadManagerListIntoSelect`)은 나중에 React 컴포넌트로 전환
   - `app/(dashboard)/reports/manager-filter.ts` 제거

4. **레거시 파일 정리**
   - `app/(dashboard)/reports/daily/` 내 레퍼런스 파일(`data.ts`, `events.ts`, `filter-table.ts`, `filters.ts`, `load.ts`, `sort.ts`, `status.ts`, `table.ts`) → 삭제 또는 `_reference-backup/`로 이동
   - `app/(dashboard)/reports/ReportFilters/`, `ReportTable/`, `StatusCards/` (레거시 클래스) → 삭제 (React 컴포넌트 완성 후)
   - `app/(dashboard)/reports/run-report-load.ts` → 삭제
   - `app/(dashboard)/reports/common.ts` → 삭제 (Skeleton UI는 Next.js Suspense 사용)

### Phase 2: 일별 데이터 레이어 (Data Layer)

**목표:** Server에서 일별 리포트 데이터를 fetch하고 가공하는 파이프라인 구축.

1. **일별 API (lib/api/reports.ts)**
   - `fetchHolidaysInRange(supabase, dateRange)` — `ads.ref_holiday` (또는 공휴일 테이블)
   - `fetchDailyReportRows(supabase, dateRange)` — `ads.daily`에서 기간 내 데이터 조회
   - 최신일은 기존 `getLatestDateFromDb()` (`lib/api/daily.ts`) 재사용
   - dateRange는 `getRecentDateRange(lastDate, 14)` (`lib/utils/date-utils.ts`) 사용

2. **일별 데이터 집계 (lib/features/reports/daily-data-builder.ts 또는 lib/api/reports.ts에 통합)**
   - 레퍼런스 `_reference/features/reports/lib/daily-report-data.ts` 참조
   - DB 원시 행 → `clientMap` 생성 → 전일 비교·평균 비교·증감 계산
   - `DailyReportDataResult` 반환 (`clients: DailyReportRow[]`, `dateRange`, `holidays`)
   - **중요:** `client_id`는 **string**으로 통일 (`40-data-main-rule`)

### Phase 3: 일별 비즈니스 로직 (Business Logic)

**목표:** 필터·정렬·상태 계산 등 순수 로직 구현.

1. **상태 계산 (lib/features/reports/daily-status.ts)**
   - 레퍼런스 `_reference/features/reports/lib/daily/status.ts` 참조
   - `calculateDailyStatus(clients: DailyReportRow[], dateRange: string[]): DailyStatusData`
   - Active(today/yesterday), New, Stopped, Rising, Falling 계산

2. **필터 로직 (lib/features/reports/daily-filters.ts)**
   - 레퍼런스 `_reference/features/reports/lib/daily/filters.ts` 참조
   - `applyDailyFilters(clients, filters)` — 상태/검색/담당자 필터 적용
   - 인자 기반, DOM 의존 제거

3. **정렬 로직 (기존 유지)**
   - `lib/features/reports/daily-sort.ts` — 이미 완료 ✅

### Phase 4: UI 컴포넌트 (UI Components)

**목표:** 필터·상태 카드·테이블 React 컴포넌트 완성.

1. **StatusCards (components/features/reports/StatusCards.tsx)**
   - 레퍼런스 `_reference/features/reports/components/StatusCards/` 참조
   - Props: `statusData: DailyStatusData`, `onCardClick: (status: string) => void`
   - 5개 카드 렌더 (Active, New, Stopped, Rising, Falling)
   - 클릭 시 부모로 상태 필터 값 전달

2. **ReportFilters (components/features/reports/ReportFilters.tsx)**
   - 레퍼런스 `_reference/features/reports/components/ReportFilters/` 참조
   - Props: 검색어/담당자/상태 초기값, `onChange` 콜백
   - 검색 input, 담당자 select, 상태 select
   - 담당자 목록은 `lib/api/managers.ts`에서 fetch (Server에서 props로 전달)

3. **DailyReportTable (기존 유지 + 개선)**
   - `components/features/reports/DailyReportTable.tsx` — 이미 완료 ✅
   - 필요 시 props 타입 개선 (예: `holidays: Set<string>` → `string[]`)

### Phase 5: 페이지 통합 (Page Integration)

**목표:** Server 데이터 로딩 + Client 상호작용 연결.

1. **Server 데이터 로딩 (page.tsx)**
   - `app/(dashboard)/reports/daily/page.tsx`를 async로 변경
   - `fetchDailyReportData()` 호출 (Phase 2에서 구현한 함수)
   - 로딩/에러 UI 처리 (Suspense, Error Boundary)
   - `DailyReportClient`에 `result` 전달

2. **Client 래퍼 (DailyReportClient.tsx)**
   - 필터/정렬 state 관리 (`useState` 또는 URL searchParams)
   - 전체 데이터(`clients`)에서 필터·정렬 적용 → 파생 목록 계산
   - `StatusCards`, `ReportFilters`, `DailyReportTable`에 props 전달
   - 카드 클릭 시 상태 필터 업데이트

3. **목 데이터 제거**
   - `app/(dashboard)/reports/daily/mock-daily-data.ts` 제거
   - 실제 데이터로 전환 완료

### Phase 6: 선택 사항 (Optional)

1. **(선택) 리포트 공통 레이아웃**
   - `app/(dashboard)/reports/layout.tsx`
   - 일별/주별 탭 또는 링크
   - 주간 리포트 구현 시 추가 고려

---

## 7. 규칙·체크리스트

### 7.1 데이터 규칙

- [x] **client_id:** 테이블·타입에서 **string**만 사용 (`40-data-main-rule`). API 연동 시에도 유지.
- [ ] **스키마:** `ads.daily`, `ads.ref_holiday`(또는 프로젝트 공휴일 테이블)만 사용 (`02-project-migration`, DB 스키마).
- [x] **날짜:** YYYY-MM-DD, `getRecentDateRange` 사용 (`31-term-main`).

### 7.2 코드 구조 규칙

- [x] **아이콘:** 테이블 정렬 등 UI는 `lucide-react`만 사용 (`23-code-iconography`).
- [x] **순수 로직:** `lib/features/reports/` — 필터·정렬·상태 계산 등 (`00-project-main`, `01-project-structure-rule`).
- [x] **API:** `lib/api/` — Supabase 호출, 데이터 fetch (`00-project-main`).
- [x] **UI 컴포넌트:** `components/features/reports/` — React 컴포넌트 (`00-project-main`).
- [x] **페이지:** `app/(dashboard)/reports/daily/` — Next.js App Router 페이지 (`00-project-main`).
- [x] **Server/Client:** 테이블·정렬은 Client Component와 state. 초기 데이터는 Server에서 fetch (`20-code-main.mdc`).

### 7.3 마이그레이션 체크리스트

#### Phase 1: 공통 인프라 정리
- [x] `lib/features/reports/shared-types.ts` 생성 (SortState, SortOrder, DailyStatusData, WeeklyStatusData)
- [x] `lib/features/reports/shared-filters.ts` 생성 (applySearchFilter)
- [x] `lib/api/managers.ts` 생성 (getManagerList, getClientIdsByManagerFilter)
- [x] `lib/features/reports/daily-types.ts` 업데이트 (shared-types 재export, DailyReportDataResult 추가)
- [x] `app/(dashboard)/reports/` 내 레거시 파일 정리 (types.ts, search-filter.ts, manager-filter.ts, common.ts, run-report-load.ts)
- [x] `app/(dashboard)/reports/daily/` 내 레퍼런스 파일 제거 (data.ts, events.ts, filter-table.ts, filters.ts, load.ts, sort.ts, status.ts, table.ts)
- [x] `app/(dashboard)/reports/ReportFilters/`, `ReportTable/`, `StatusCards/` 레거시 클래스 삭제

#### Phase 2: 일별 데이터 레이어
- [ ] `lib/api/reports.ts` 추가 — fetchHolidaysInRange, fetchDailyReportRows
- [ ] 일별 데이터 집계 로직 구현 (clientMap, 전일/평균 비교) — daily-data-builder.ts 또는 reports.ts에 통합
- [ ] `client_id`를 string으로 통일 검증

#### Phase 3: 일별 비즈니스 로직
- [ ] `lib/features/reports/daily-status.ts` — calculateDailyStatus
- [ ] `lib/features/reports/daily-filters.ts` — applyDailyFilters

#### Phase 4: UI 컴포넌트
- [ ] `components/features/reports/StatusCards.tsx` — 5개 카드 + 클릭 이벤트
- [ ] `components/features/reports/ReportFilters.tsx` — 검색/담당자/상태 필터

#### Phase 5: 페이지 통합
- [ ] `page.tsx` async 데이터 로딩 (fetchDailyReportData)
- [ ] `DailyReportClient.tsx` 필터/정렬 state 연결
- [ ] 목 데이터 제거 (mock-daily-data.ts)
- [ ] 테스트 및 검증 (데이터 표시, 필터/정렬 동작, 상태 카드 클릭)

---

## 8. 참고 문서

- `_docs/MIGRATION_ANALYSIS.md` — 섹션 3.2 Reports, 10.8 Reports Feature, 9.6 이하 매핑 테이블.
- `_reference/features/reports/` — 일별 로드·데이터·필터·정렬·테이블·상태 카드·이벤트.
- `_reference/shared/api/report-api.ts` — Supabase 쿼리 시그니처 (테이블명만 ads 스키마로 치환).
- `supabase/migrations/00_ads_tables_structure.md` — ads.daily, ads.client, client_id string.
- `.cursor/rules/40-data-main-rule.mdc` — client_id string.
- `.cursor/rules/31-term-main.mdc` — 날짜·공휴일 용어.

---

**현재:** §5.1 구현 완료(테이블·정렬·목 데이터)까지 반영됨. 다음 단계는 §5.2 구현 예정 순서대로 API·상태·필터·UI 조합 진행하면 됩니다. 수정·추가 요구가 있으면 알려주세요.

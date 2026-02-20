# 일별 리포트 실제 데이터 연결 — 계획서

**작성일:** 2026-02-20  
**목적:** 일별 리포트 화면을 Mock 데이터가 아닌 Supabase `ads` 스키마 실제 데이터와 연결한다.

---

## 1. 현황 정리

### 1.1 현재 구조

| 구분 | 경로 | 설명 |
|------|------|------|
| 페이지 | `app/(dashboard)/reports/daily/page.tsx` | `DailyReportClient`만 렌더링 |
| 클라이언트 컴포넌트 | `app/(dashboard)/reports/daily/DailyReportClient.tsx` | **Mock 전용**: `getMockDateRange`, `getMockHolidays`, `getMockClients` 사용 |
| Mock 데이터 | `app/(dashboard)/reports/daily/mock-daily-data.ts` | 14일 날짜 범위, 공휴일(빈 Set), 고정 클라이언트 2~3건 |
| 데이터 레이어 (미사용) | `app/(dashboard)/reports/daily-report-data.ts` | `fetchDailyReportData()` 존재하나 **페이지/클라이언트에서 호출되지 않음**. `@shared/api/report-api` 참조(레퍼런스용, 현재 프로젝트에는 해당 경로 없음) |
| 타입 | `lib/features/reports/daily-types.ts` | `DailyReportRow` 등, **client_id: string** (40-data-main-rule 준수) |
| 테이블 UI | `components/features/reports/DailyReportTable.tsx` | `DailyReportRow[]`, `dateRange`, `holidays` 등 props로 받아 표시 |

### 1.2 프로젝트 DB/API 규칙

- **스키마:** `ads`(프로젝트 데이터), `shared`(참조). `public` / `ads_data_daily` 등 레거시 테이블명 사용 금지.
- **일별 테이블:** `ads.daily` (컬럼: `date`, `client_id`(TEXT), `client_name`, `manager_id`, `revenue`, …).
- **공휴일:** `ads.ref_holiday` 뷰 (원본 `shared.holiday`). 컬럼 `holiday_name`에 날짜(YYYY-MM-DD) 저장된다고 가정(기존 csv-uploader와 동일).
- **client_id:** 모든 레이어에서 **문자열만** 사용 (40-data-main-rule).
- **Supabase 클라이언트:** 서버에서는 `createServerClient` 등, 클라이언트에서는 `createClient` (`lib/supabase/`).

### 1.3 갭

- 일별 리포트 API가 **ads 스키마 기준**으로 프로젝트에 없음 (`lib/api/daily.ts`는 최신일 1건만 조회).
- `daily-report-data.ts`는 레퍼런스용 `@shared/api/report-api`를 참조하며, 해당 API는 `ads_data_daily` / `shared_holiday` 기준이라 **현재 스키마와 불일치**.
- UI는 전부 Mock에 의존하고 있어, **데이터 소스를 실제 조회로 전환**하는 작업이 필요.

---

## 2. 목표

- 일별 리포트가 **ads.daily**, **ads.ref_holiday** 기준으로 **실제 데이터**를 조회해 표시하도록 한다.
- 기존 Mock은 제거하거나(또는 개발용 플래그로만 유지) 실제 데이터가 없을 때의 빈 상태로 대체한다.
- Server Component에서 데이터를 가져와 props로 내려주는 방식을 우선한다 (Next.js 권장, 20-code-main / vercel-react-best-practices).

---

## 3. 작업 범위 및 단계

### 3.1 1단계: 리포트용 API 레이어 추가 (`lib/api/`)

**목적:** ads 스키마 전용 일별 리포트 쿼리 제공.

**경로:** `lib/api/report-daily.ts` (신규) 또는 `lib/api/report.ts`에 일별 함수만 먼저 추가.

**제공 함수 (레퍼런스 `_reference/shared/api/report-api.ts` 로직을 ads 스키마에 맞게 이식):**

| 함수명 | 역할 | 대상 테이블/뷰 |
|--------|------|----------------|
| `fetchLastReportDate()` | DB 최신 `date` 1건 반환 (YYYY-MM-DD 또는 null) | `ads.daily` |
| `fetchHolidaysInRange(dateRange: string[])` | 해당 기간 공휴일 날짜 Set 반환 | `ads.ref_holiday` (컬럼 `holiday_name`을 날짜로 사용) |
| `fetchDailyReportRows(dateRange: string[])` | 기간 내 일별 행 조회 (client_id, client_name, manager_id, date, revenue). 페이지네이션·병렬 조회 시 1000건 단위 등 기존 규칙 준수 | `ads.daily` |

**타입:**

- Raw 행 타입: `client_id: string`, `date: string`, `revenue: number` 등. `DailyRawRow` 등으로 정의.

**의존성:**

- Supabase 클라이언트는 **호출부에서 주입**하거나, 서버 전용이면 `createClient()` from `@/lib/supabase/client` (또는 server용 생성 함수) 사용. 서버에서만 쓸 경우 server 클라이언트 사용 권장.

**참고:**

- `_reference/shared/api/report-api.ts`의 `fetchLastReportDate`, `fetchHolidaysInRange`, `fetchDailyReportRows`를 복사·수정하여 `ads.daily` / `ads.ref_holiday`로 치환.
- `ads.ref_holiday`의 날짜 컬럼이 `holiday_name`이면, `in('holiday_name', dateRange)` 형태로 범위 조회 (형식이 YYYY-MM-DD라고 가정).

---

### 3.2 2단계: 일별 리포트 데이터 레이어 정리 (`daily-report-data.ts`)

**목적:** 위 API만 사용하고, 반환 타입을 `lib/features/reports/daily-types`와 맞춘다.

**경로:** `app/(dashboard)/reports/daily-report-data.ts` (기존 파일 수정).

**변경 사항:**

1. **import 변경:** `@shared/api/report-api` → `@/lib/api/report-daily`(또는 `report`)에서 위 3함수 import. Supabase 타입은 `@supabase/supabase-js` 또는 프로젝트 `types/` 사용.
2. **client_id 타입 통일:** 내부 `DailyReportRow` 및 `clientDataMap`을 **전부 `client_id: string`** 기준으로 변경 (이미 daily-types는 string이므로, 이 파일만 number → string으로 수정).
3. **캐시:** `cachedDailyDateRange` 등 기존 캐시 정책 유지 여부 결정 (유지해도 됨).
4. **반환 타입:** `DailyReportDataResult`를 `lib/features/reports/daily-types`의 것과 동일하게 맞추거나, 해당 타입을 re-export하여 한 곳에서만 정의.

**동작:**

- `fetchDailyReportData(supabase)` 호출 시:
  - `fetchLastReportDate(supabase)` → 최신일 기준 14일 `dateRange` 생성.
  - `fetchHolidaysInRange(supabase, dateRange)`.
  - `fetchDailyReportRows(supabase, dateRange)` → 클라이언트별로 묶고, 전일 대비·평균 대비 비율 등 기존 로직으로 `DailyReportRow[]` 생성.
- 데이터 없음 시 `null` 반환 유지.

---

### 3.3 3단계: 페이지에서 서버 데이터 조회 후 클라이언트에 전달

**목적:** Server Component에서 한 번만 조회하고, 클라이언트는 props로 받아 표시.

**경로:**  
- `app/(dashboard)/reports/daily/page.tsx`  
- `app/(dashboard)/reports/daily/DailyReportClient.tsx`

**page.tsx (Server Component):**

- `async function DailyReportPage()` 로 변경.
- `createServerClient`(또는 프로젝트의 서버용 Supabase 생성 함수)로 supabase 인스턴스 생성.
- `fetchDailyReportData(supabase)` 호출.
- 결과가 `null`이면 "데이터 없음" 메시지 또는 빈 테이블용 초기값(`dateRange: []`, `clients: []`, `holidays: new Set()`)으로 렌더.
- `DailyReportClient`에 props로 전달:  
  `initialData={result}` 또는 `dateRange`, `holidays`, `clients` 개별 전달.  
  (Set은 직렬화 불가하므로 `holidays: string[]` 등으로 변환해 전달 후 클라이언트에서 `Set`으로 복원.)

**DailyReportClient.tsx (Client Component):**

- Mock 대신 **props로 받은 실제 데이터** 사용.
  - 예: `initialData: DailyReportDataResult | null` 또는 `dateRange`, `holidays`, `clients`.
  - `holidays`는 배열로 받아 `useMemo(() => new Set(holidays), [holidays])` 등으로 Set 복원.
- 정렬 상태(`sortState`)는 기존처럼 클라이언트 state 유지.
- `clients`는 `initialData.clients`를 정렬 함수(`sortDailyClients`)에 넣어 표시.
- **로딩/에러:** 서버에서 이미 데이터를 가져오므로, 페이지 레벨에서 Suspense/error boundary로 처리하거나, 데이터 없음 시 문구만 표시하면 됨.

**데이터 없음 처리:**

- `fetchDailyReportData`가 `null`을 반환할 때(예: ads.daily에 행이 없을 때):  
  "일별 데이터가 없습니다. 데이터를 업로드해 주세요." 같은 문구와 빈 테이블 또는 플레이스홀더만 표시.

---

### 3.4 4단계: Mock 제거 또는 개발 전용으로 전환

**경로:** `app/(dashboard)/reports/daily/mock-daily-data.ts`, `DailyReportClient.tsx`.

**옵션 A (권장):** 실제 데이터만 사용

- `DailyReportClient`에서 `getMockDateRange`, `getMockHolidays`, `getMockClients` import 및 사용 제거.
- Mock 파일은 삭제하거나, 나중에 스토리북/테스트용으로만 남겨둠.

**옵션 B:** 개발 시에만 Mock 사용

- 환경 변수(예: `NEXT_PUBLIC_USE_MOCK_DAILY_REPORT`)로 분기해, true일 때만 Mock 사용.  
  실제 운영에서는 사용하지 않도록 문서화.

---

## 4. 타입·의존성 정리

- **DailyReportRow, DailyReportDataResult:** `lib/features/reports/daily-types.ts`를 단일 소스로 사용. `daily-report-data.ts`는 여기서 import하거나 re-export만 한다.
- **Supabase 타입:** `SupabaseClient`는 `@supabase/supabase-js` 또는 `types/database.types.ts` 등 프로젝트에서 쓰는 타입으로 통일.
- **client_id:** 모든 레이어에서 `string` 유지 (API Raw 행, DailyReportRow, DB 조회 결과 매핑).

---

## 5. 체크리스트 (구현 후 확인)

- [ ] `lib/api/report-daily.ts`(또는 report.ts)에 `fetchLastReportDate`, `fetchHolidaysInRange`, `fetchDailyReportRows` 구현됨. 모두 `ads.daily` / `ads.ref_holiday` 사용.
- [ ] `daily-report-data.ts`가 위 API만 사용하며, `client_id`를 string으로 처리.
- [ ] `page.tsx`가 서버에서 `fetchDailyReportData`를 호출하고, 결과를 `DailyReportClient`에 props로 전달.
- [ ] `DailyReportClient`는 Mock 제거 후 props 기반으로만 렌더.
- [ ] 데이터 없음 시 안내 문구 또는 빈 테이블 표시.
- [ ] 일별 리포트 화면에서 실제 DB 데이터가 테이블에 반영되는지 확인.

---

## 6. 참고 파일

| 용도 | 경로 |
|------|------|
| 레퍼런스 API (ads_data_daily 기준) | `_reference/shared/api/report-api.ts` |
| 현재 일별 데이터 로직 (미사용) | `app/(dashboard)/reports/daily-report-data.ts` |
| 일별 타입 정의 | `lib/features/reports/daily-types.ts` |
| 일별 클라이언트·Mock | `app/(dashboard)/reports/daily/DailyReportClient.tsx`, `mock-daily-data.ts` |
| ads 스키마 일별 테이블 | `supabase/migrations/20260219_table_daily.sql` |
| ads 공휴일 뷰 | `supabase/migrations/20260219_ads_ref_views.sql` |
| 마이그레이션 분석 | `_docs/MIGRATION_ANALYSIS.md` |
| 데이터 규칙 | `.cursor/rules/40-data-main-rule.mdc` |

---

이 계획서 확인 후 진행 여부와 1~4단계 순서(한 번에 진행할지, 단계별로 할지)만 정해 주시면, 그에 맞춰 구현 단위로 작업하겠습니다.

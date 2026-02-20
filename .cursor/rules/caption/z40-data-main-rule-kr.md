---
description: 데이터 타입(client_id 문자열), 스키마, 네이밍, 데이터 처리 규칙
globs: "app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts", "lib/**/*.tsx", "types/*.ts", "components/**/*.{ts,tsx}"
alwaysApply: true
---

# 데이터: client_id는 문자열로

식별자 일관성, 앞자리 0 유지, 외부 시스템과의 호환을 위해 `client_id`는 **항상 문자열**로만 다룬다.

## 1. 요약

| 영역 | 규칙 |
|------|------|
| **TypeScript** | `client_id` 타입은 `string`만. `number`나 `Brand<number, 'ClientId'>` 사용 금지 |
| **SQL / DB** | 컬럼/파라미터: `VARCHAR`, `TEXT`, `uuid` 등. `INTEGER`, `BIGINT` 사용 금지 |
| **API / 쿼리** | Supabase 응답, RPC 인자, CSV/폼 입력: `client_id`는 **문자열**로만 주고받는다 |

## 2. TypeScript

```typescript
// ✅ 좋음
type ClientRow = {
  client_id: string;
  client_name: string;
};

function loadByClient(clientId: string) {
  return supabase.from("ads_data_client").select("*").eq("client_id", clientId);
}
```

```typescript
// ❌ 나쁨
client_id: number;
client_id: Brand<number, 'ClientId'>;
.eq('client_id', Number(id));
```

## 3. SQL / DB

- 테이블 컬럼: `client_id VARCHAR(...)` 또는 `TEXT`, `uuid`.
- RPC/함수 인자: 문자열 타입으로 선언하고, 호출 시에도 문자열만 전달.

## 4. API / 쿼리

- Supabase `.eq('client_id', value)`에 넘기는 값은 항상 `string`.
- CSV/폼에서 올 때: 숫자로 파싱하지 않고, 필요하면 `String(...)`으로 정규화.

## 5. 이유

- **일관성:** 숫자/문자 혼용과 비교·키 버그 방지.
- **앞자리 0:** 예: `"001"`이 `1`로 바뀌면 안 됨.
- **연동:** 문자열 ID를 쓰는 외부 시스템과 맞춤.

---

# 데이터 구조 및 스키마 규칙

이 파일은 프로젝트의 DB 스키마와 데이터 모델링 원칙에 대한 **단일 진실 공급원(Single Source of Truth)** 역할도 한다.

## 6. 네이밍 규칙 (엄격)

DB 컬럼 및 관련 변수는 가독성과 자동완성 그룹화를 위해 아래 접두사/접미사를 따른다.

- **값(통화/정수):** 의미를 담은 이름 (예: `actual_monthly`, `target_monthly`, `monthly_ads`). 접두사 `val_`은 사용하지 않음.
- **건수:** `cnt_` (예: `cnt_clicks`, `cnt_impressions`)
- **비율:** `_rate` 접미사 (예: `achievement_rate`)
- **퍼센트:** `_pct` 접미사 (예: `margin_pct`)
- **날짜:** `date_` 접두사 (예: `date_target`, `date_created`)
- **불리언:** `is_` 또는 `has_` (예: `is_active`, `has_permission`)
- **상태:** `status_` (예: `status_payment`)

## 7. 스키마 전략

- **프로젝트 스키마:** 프로젝트 전용 데이터는 `ads` 스키마를 사용한다.

## 8. 핵심 테이블 및 참조 뷰 (`ads` 스키마)

### 8.1 예: `monthly_kpi` (목표·실적 통합)

카테고리/국가/월당 한 행으로 월별 목표와 누적 실적을 함께 저장한다.

```sql
create table ads.monthly_kpi (
  id bigint generated always as identity primary key,

  -- 차원 (유일 제약 조합)
  data_month date not null,       -- 해당 월의 첫날 (예: '2024-03-01')
  category text not null,         -- 'ads' 또는 'media' (enum 형태 check)
  country text not null,          -- 'kr' 또는 'us' (enum 형태 check)

  -- 실적 컬럼 (Upsert로 지속 갱신)
  actual numeric default 0,

  -- 메타데이터
  updated_at timestamptz default now(),

  -- 제약
  constraint monthly_kpi_uniq unique (data_month, category, country),
  check (category in ('ads', 'media')),
  check (country in ('kr', 'us'))
);
```

### 8.2 참조 뷰 (`shared` 기반)

`shared` 테이블을 복제하지 말고, `ads` 스키마에서 동일하게 접근할 수 있도록 뷰로 반영한다.

- `ads.ref_manager` → `shared.manager` 반영
- `ads.ref_week` → `shared.week` 반영
- `ads.ref_holiday` → `shared.holiday` 반영

**사용:** 해당 참조 뷰는 읽기 전용으로 사용하며, 수정은 원본 스키마(`shared`)에서 수행한다.

## 체크리스트

- [ ] TS 타입에서 `client_id`를 `string`으로 정의했는가?
- [ ] Supabase/RPC 호출 시 `client_id`에 문자열만 넘기는가?
- [ ] CSV/폼 입력에서 `client_id`를 숫자로 변환하지 않는가?
- [ ] 새 DB 컬럼이 네이밍 규칙(cnt_, _rate, _pct, date_, is_, has_, status_)을 따르는가?
- [ ] 프로젝트 전용 데이터는 `ads` 스키마를 쓰고, 공용 참조는 뷰로만 쓰는가?

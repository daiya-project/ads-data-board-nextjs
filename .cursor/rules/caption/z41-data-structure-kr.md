---
description: Ads Dashboard 프로젝트의 DB 스키마 정의, 네이밍 규칙, 데이터 처리 규칙
globs: "lib/supabase/**/*", "lib/api/**/*", "types/*.ts", "app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"
---

# 데이터 구조 및 스키마 규칙

이 파일은 프로젝트의 DB 스키마와 데이터 모델링 원칙에 대한 **단일 진실 공급원(Single Source of Truth)** 역할을 한다.

## 1. 네이밍 규칙 (엄격)

DB 컬럼 및 관련 변수는 가독성과 자동완성 그룹화를 위해 아래 접두사/접미사를 따른다.

- **값(통화/정수):** 의미를 담은 이름 (예: `actual_monthly`, `target_monthly`, `monthly_ads`). 접두사 `val_`은 사용하지 않음.
- **건수:** `cnt_` (예: `cnt_clicks`, `cnt_impressions`)
- **비율:** `_rate` 접미사 (예: `achievement_rate`)
- **퍼센트:** `_pct` 접미사 (예: `margin_pct`)
- **날짜:** `date_` 접두사 (예: `date_target`, `date_created`)
- **불리언:** `is_` 또는 `has_` (예: `is_active`, `has_permission`)
- **상태:** `status_` (예: `status_payment`)

## 2. 스키마 전략

- **프로젝트 스키마:** 프로젝트 전용 데이터는 `ads` 스키마를 사용한다.

## 3. 핵심 테이블 정의 (`ads` 스키마)

### 3.1 `monthly_kpi` (목표·실적 통합)
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

### 3.2 참조 뷰 (`shared` 기반)

`shared` 테이블을 복제하지 말고, `ads` 스키마에서 동일하게 접근할 수 있도록 뷰로 반영한다.

- `ads.ref_manager` → `shared.manager` 반영
- `ads.ref_week` → `shared.week` 반영
- `ads.ref_holiday` → `shared.holiday` 반영

**사용:** 해당 참조 뷰는 읽기 전용으로 사용하며, 수정은 원본 스키마(`shared`)에서 수행한다.

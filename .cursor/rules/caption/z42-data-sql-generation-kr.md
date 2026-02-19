---
description: SQL 스키마, 뷰, 트리거 생성 시 준수할 규칙.
globs: "*.sql"
---

# Database SQL 생성 규칙

DDL, View, Trigger 등 SQL 문을 생성할 때 아래 문서화 기준을 **반드시** 따른다.

## 1. 논리 인라인 주석

계산, `WHERE`, `JOIN` 등을 **이유**가 드러나도록 `--` 주석으로 설명한다.

```sql
-- 영업일만 집계: 공휴일 제외하여 YTD 합계가 업무 달력과 맞도록 함.
SELECT SUM(revenue) FROM ads_data_daily
WHERE is_holiday = false;
```

## 2. 메타데이터 주석 (COMMENT ON)

스크립트 끝에 `COMMENT ON TABLE` / `COMMENT ON VIEW` / `COMMENT ON FUNCTION`을 붙여 **비즈니스 목적**을 설명한다.

```sql
COMMENT ON TABLE dna_kpi.monthly_kpi IS 'Wide KPI 테이블: (month, country, type)당 1행. 목표/실적 및 카테고리별 컬럼.';
COMMENT ON VIEW my_schema.revenue_ytd IS '연간 누적 매출(클라이언트별). 대시보드 카드용.';
```

## 3. 컬럼 주석

**파생/계산/메트릭** 컬럼에는 `COMMENT ON COLUMN`을 붙이고, **단위**(%, KRW 등)와 **계산식**을 명시한다.

```sql
COMMENT ON COLUMN dna_kpi.monthly_kpi.mf_rate_pct IS '목표 비율 0–100(%). monthly_mf = monthly_pub * (mf_rate_pct/100) 로 사용.';
COMMENT ON COLUMN my_view.achievement_rate IS '파생: target > 0 일 때 actual_monthly / target_monthly; 단위: 비율(표시 시 %).';
```

---

## 체크리스트

- [ ] 인라인 `--` 주석으로 계산/WHERE/JOIN의 *이유*를 설명했는가?
- [ ] 스크립트 끝에 비즈니스 목적을 담은 `COMMENT ON TABLE/VIEW/FUNCTION`을 두었는가?
- [ ] 파생/계산/메트릭 컬럼에 단위·계산식이 포함된 `COMMENT ON COLUMN`을 두었는가?

---

## 제안 사항 (룰 또는 코드베이스 반영 검토)

- **트리거 주석:** 각 트리거에 `COMMENT ON TRIGGER ... IS '...'` 추가 권장 (예: `tr_monthly_kpi_updated_at` → “행 수정 시 updated_at 갱신”).
- **제약 조건 네이밍:** `CHECK`/유니크 제약은 일관된 접두사 사용(예: `chk_<table>_<column>`, `uq_<table>_<columns>`)을 문서화하고, 비즈니스 규칙이 불명확한 경우 `COMMENT ON CONSTRAINT`로 간단히 설명.
- **마이그레이션 순서:** 번호 부여 마이그레이션(예: `supabase/migrations/YYYYMMDD_name.sql`) 사용 시 “파일당 하나의 논리적 변경; 다른 마이그레이션에서 의존하는 객체는 DROP 하지 않기”를 룰에 명시할 것.

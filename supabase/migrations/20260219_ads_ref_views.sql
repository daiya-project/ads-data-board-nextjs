-- Create views in ads schema that reference shared.holiday, shared.manager, shared.week
-- 뷰만 생성하며, 데이터는 shared 스키마 원본을 참조합니다.

-- 1. ref_holiday: shared.holiday 참조 뷰
CREATE OR REPLACE VIEW ads.ref_holiday AS
SELECT
  id,
  holiday_date,
  holiday_name,
  is_lunar,
  created_at
FROM shared.holiday;

COMMENT ON VIEW ads.ref_holiday IS '공휴일 참조 뷰. 원본: shared.holiday';

-- 2. ref_manager: shared.manager 참조 뷰
CREATE OR REPLACE VIEW ads.ref_manager AS
SELECT
  id,
  manager_name,
  manager_team,
  display_order,
  created_at,
  updated_at
FROM shared.manager;

COMMENT ON VIEW ads.ref_manager IS '매니저 참조 뷰. 원본: shared.manager';

-- 3. ref_week: shared.week 참조 뷰
CREATE OR REPLACE VIEW ads.ref_week AS
SELECT
  week_id,
  start_date,
  end_date,
  week_number,
  year,
  week_label,
  created_at,
  updated_at
FROM shared.week;

COMMENT ON VIEW ads.ref_week IS '주차 참조 뷰. 원본: shared.week';

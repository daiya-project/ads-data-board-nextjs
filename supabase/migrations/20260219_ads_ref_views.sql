-- 1. ref_holiday: 공휴일 참조 (원본: shared.holiday)
CREATE OR REPLACE VIEW ads.ref_holiday AS
SELECT
  id,
  holiday_name,
  created_at
FROM shared.holiday;

COMMENT ON VIEW ads.ref_holiday IS '공휴일 참조 뷰. 원본: shared.holiday';

-- 2. ref_manager: 매니저 참조 (원본: shared.manager)
CREATE OR REPLACE VIEW ads.ref_manager AS
SELECT
  id,
  name,
  team,
  display_order,
  created_at,
  updated_at
FROM shared.manager;

COMMENT ON VIEW ads.ref_manager IS '매니저 참조 뷰. 원본: shared.manager';

-- 3. ref_week: 주차 참조 (원본: shared.week)
CREATE OR REPLACE VIEW ads.ref_week AS
SELECT
  id,
  date_start,
  date_end,
  week_number,
  year,
  display_label,
  created_at,
  updated_at
FROM shared.week;

COMMENT ON VIEW ads.ref_week IS '주차 참조 뷰. 원본: shared.week';

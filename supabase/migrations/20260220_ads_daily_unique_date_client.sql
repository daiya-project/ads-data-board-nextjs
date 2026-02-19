-- ads.daily: (date, client_id) 유일 제약 추가 — append 모드에서 최신일 당일 upsert 가능하도록
-- 기존 중복이 있으면 id가 큰 행만 남기고 제거 후 제약 추가

-- 1) (date, client_id) 중복 중 id가 작은 행 삭제 (같은 조합에 대해 id 최대인 행만 유지)
DELETE FROM ads.daily a
USING ads.daily b
WHERE a.date = b.date
  AND a.client_id = b.client_id
  AND a.id < b.id;

-- 2) 유일 제약 추가
ALTER TABLE ads.daily
  ADD CONSTRAINT ads_daily_date_client_id_key UNIQUE (date, client_id);

COMMENT ON CONSTRAINT ads_daily_date_client_id_key ON ads.daily IS '일별·클라이언트당 1행. CSV append 시 최신일 당일 upsert용.';

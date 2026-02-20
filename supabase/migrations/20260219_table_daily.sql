-- ads.daily: 일별 광고 데이터 (클라이언트·날짜 단위 매출·노출·클릭·전환)
-- 참조: supabase/migrations/00_ads_tables_structure.md §1
-- 관계: client_id → ads.client(client_id) (FK는 20260219_table_client.sql에서 추가)

CREATE TABLE IF NOT EXISTS ads.daily (
  id               SERIAL PRIMARY KEY,
  date             DATE NOT NULL,
  client_id        TEXT NOT NULL,
  client_name      TEXT,
  manager_id       INTEGER REFERENCES shared.manager(id),
  sales_manager_id INTEGER REFERENCES shared.manager(id),
  revenue          INTEGER NOT NULL DEFAULT 0,
  vimp             INTEGER,
  click            INTEGER,
  conversion       INTEGER,
  is_holiday       BOOLEAN,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ads.daily IS '일별 광고 데이터. 클라이언트·날짜 단위 매출·노출·클릭·전환. client_id → ads.client(client_id), manager_id/sales_manager_id → shared.manager(id).';
COMMENT ON COLUMN ads.daily.id IS '행 식별자 (SERIAL)';
COMMENT ON COLUMN ads.daily.date IS '날짜 (YYYY-MM-DD)';
COMMENT ON COLUMN ads.daily.client_id IS '클라이언트 ID (문자열, 선행 0 유지). FK → ads.client(client_id)';
COMMENT ON COLUMN ads.daily.client_name IS '클라이언트명 스냅샷';
COMMENT ON COLUMN ads.daily.manager_id IS '담당 매니저 ID → shared.manager(id), NULL 허용';
COMMENT ON COLUMN ads.daily.sales_manager_id IS '영업 매니저 ID → shared.manager(id), NULL 허용';
COMMENT ON COLUMN ads.daily.revenue IS '매출(금액)';
COMMENT ON COLUMN ads.daily.vimp IS '노출 수';
COMMENT ON COLUMN ads.daily.click IS '클릭 수';
COMMENT ON COLUMN ads.daily.conversion IS '전환 수';
COMMENT ON COLUMN ads.daily.is_holiday IS '공휴일 여부';
COMMENT ON COLUMN ads.daily.created_at IS '생성 시각';
COMMENT ON COLUMN ads.daily.updated_at IS '수정 시각';

-- 인덱스: 날짜·클라이언트 조회, 매니저·날짜 필터
CREATE INDEX IF NOT EXISTS idx_ads_daily_date_client
  ON ads.daily (date DESC, client_id);

CREATE INDEX IF NOT EXISTS idx_ads_daily_client_date
  ON ads.daily (client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ads_daily_manager_date
  ON ads.daily (manager_id, date DESC)
  WHERE manager_id IS NOT NULL;

-- updated_at 자동 갱신 (선택)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ads_daily_updated_at ON ads.daily;
CREATE TRIGGER tr_ads_daily_updated_at
  BEFORE UPDATE ON ads.daily
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

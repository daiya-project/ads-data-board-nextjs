-- ads.client: 광고 클라이언트(광고주) 마스터. 담당 매니저, 부 담당 매니저.
-- 참조: supabase/migrations/00_ads_tables_structure.md §2

CREATE TABLE IF NOT EXISTS ads.client (
  client_id        TEXT PRIMARY KEY,
  client_name      TEXT NOT NULL,
  manager_id       INTEGER REFERENCES shared.manager(id),
  sales_manager_id INTEGER REFERENCES shared.manager(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ads.client IS '광고 클라이언트(광고주) 마스터. 담당 매니저, 부 담당 매니저 등.';
COMMENT ON COLUMN ads.client.client_id IS '클라이언트 ID (문자열, 선행 0 유지)';
COMMENT ON COLUMN ads.client.manager_id IS '담당 매니저 ID → shared.manager.id (FK, NULL 허용)';
COMMENT ON COLUMN ads.client.sales_manager_id IS '부 담당 매니저 ID → shared.manager.id (FK, NULL 허용)';

-- 인덱스: 매니저별 클라이언트 조회
CREATE INDEX IF NOT EXISTS idx_ads_client_manager
  ON ads.client (manager_id)
  WHERE manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ads_client_sales_manager
  ON ads.client (sales_manager_id)
  WHERE sales_manager_id IS NOT NULL;

-- updated_at 자동 갱신 (set_updated_at은 20260219_table_daily.sql에서 정의됨)
DROP TRIGGER IF EXISTS tr_ads_client_updated_at ON ads.client;
CREATE TRIGGER tr_ads_client_updated_at
  BEFORE UPDATE ON ads.client
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ads.daily.client_id → ads.client(client_id) FK (daily 생성 후 client 테이블 존재 시 적용)
ALTER TABLE ads.daily
  ADD CONSTRAINT fk_ads_daily_client
  FOREIGN KEY (client_id) REFERENCES ads.client(client_id);

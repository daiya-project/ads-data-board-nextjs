-- Create schema: ads
-- 광고팀 관련 데이터(일별 광고, 클라이언트, 아웃바운드, CRM 등)를 담는 스키마.
CREATE SCHEMA IF NOT EXISTS ads;

COMMENT ON SCHEMA ads IS '광고팀의 일별 광고 데이터, 클라이언트 정보, 아웃바운드 데이터, CRM 등 관련 테이블을 담는 스키마.';

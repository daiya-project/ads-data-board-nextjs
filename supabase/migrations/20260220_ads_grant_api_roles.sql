-- API 역할(anon, authenticated, service_role)에 ads 스키마 접근 권한 부여.
-- 호스팅 프로젝트에서 "permission denied for schema ads" 해결용.
-- Exposed schemas에 ads 추가 후에도 이 GRANT가 없으면 PostgREST가 스키마에 접근할 수 없음.

GRANT USAGE ON SCHEMA ads TO anon, authenticated, service_role;

-- ads 스키마 내 모든 테이블/뷰에 대한 SELECT, INSERT, UPDATE, DELETE
GRANT ALL ON ALL TABLES IN SCHEMA ads TO anon, authenticated, service_role;

-- 시퀀스(예: daily.id의 SERIAL) 권한
GRANT ALL ON ALL SEQUENCES IN SCHEMA ads TO anon, authenticated, service_role;

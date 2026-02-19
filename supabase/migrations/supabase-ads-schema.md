# Supabase `ads` 스키마 노출 및 권한 (Invalid schema / permission denied 해결)

이 프로젝트는 `ads`(및 필요 시 `shared`) 스키마의 테이블을 사용합니다.

- **"Invalid schema: ads"** → API에 스키마가 노출되지 않음.
- **"permission denied for schema ads"** → Exposed schemas 추가 후, DB 역할에 스키마 **권한(GRANT)** 이 없음.

## 해결 방법

### 1. Supabase 대시보드 (호스팅 프로젝트)

1. [Supabase Dashboard](https://supabase.com/dashboard) → 해당 프로젝트 선택
2. **Project Settings** (왼쪽 하단 톱니바퀴) → **API**
3. **Exposed schemas** 항목에서 `public` 외에 **`ads`** (및 `shared` 사용 시 **`shared`**) 추가 후 저장

**permission denied** 가 나오면, 스키마/테이블에 대한 **권한 부여**가 필요합니다.  
아래 SQL을 **SQL Editor**에서 실행하세요.

```sql
-- ads 스키마 사용 권한
GRANT USAGE ON SCHEMA ads TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ads TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ads TO anon, authenticated, service_role;
```

또는 마이그레이션을 적용했다면 `supabase/migrations/20260220_ads_grant_api_roles.sql` 내용이 이미 적용된 상태입니다. 호스팅 프로젝트에 마이그레이션을 **push**했는지 확인하세요.

### 2. 로컬 Supabase (supabase/config.toml)

로컬 개발 시 `supabase/config.toml`의 `[api]`에 노출 스키마를 지정합니다.  
이 프로젝트에는 이미 **`schemas = ["public", "ads", "shared"]`** 가 설정되어 있습니다.

```toml
[api]
schemas = ["public", "ads", "shared"]
```

변경 후 `supabase start` 다시 실행(또는 API 재시작).

### 3. 로컬에서 마이그레이션 적용

로컬 Supabase에서 권한 마이그레이션 적용:

```bash
supabase db reset
# 또는
supabase migration up
```

### 4. 스키마 반영이 안 될 때

스키마를 추가했는데도 같은 오류가 나면 PostgREST에 스키마 목록을 다시 읽게 할 수 있습니다.

Supabase SQL Editor에서 실행:

```sql
NOTIFY pgrst, 'reload schema';
```

또는 `authenticator` 역할에 스키마가 반영되도록:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, ads, shared';
-- 이후
NOTIFY pgrst, 'reload schema';
```

---

**참고:** 테이블은 `supabase/migrations/` 의 마이그레이션으로 `ads.client`, `ads.daily`, `ads.ref_holiday` 등이 생성됩니다. 마이그레이션 적용 후 위 설정만 맞으면 API로 접근할 수 있습니다.

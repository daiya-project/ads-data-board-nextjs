---
description: 데이터 타입, 포맷 로직, 지표 계산(비즈니스 로직) 관련 규칙
globs: "app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts", "lib/**/*.tsx"
alwaysApply: true
---

# 데이터: client_id는 문자열로

식별자 일관성, 앞자리 0 유지, 외부 시스템과의 호환을 위해 `client_id`는 **항상 문자열**로만 다룬다.

## 1. 요약

| 영역 | 규칙 |
|------|------|
| **TypeScript** | `client_id` 타입은 `string`만. `number`나 `Brand<number, 'ClientId'>` 사용 금지 |
| **SQL / DB** | 컬럼/파라미터: `VARCHAR`, `TEXT`, `uuid` 등. `INTEGER`, `BIGINT` 사용 금지 |
| **API / 쿼리** | Supabase 응답, RPC 인자, CSV/폼 입력: `client_id`는 **문자열**로만 주고받는다 |

## 2. TypeScript

```typescript
// ✅ 좋음
type ClientRow = {
  client_id: string;
  client_name: string;
};

function loadByClient(clientId: string) {
  return supabase.from("ads_data_client").select("*").eq("client_id", clientId);
}
```

```typescript
// ❌ 나쁨
client_id: number;
client_id: Brand<number, 'ClientId'>;
.eq('client_id', Number(id));
```

## 3. SQL / DB

- 테이블 컬럼: `client_id VARCHAR(...)` 또는 `TEXT`, `uuid`.
- RPC/함수 인자: 문자열 타입으로 선언하고, 호출 시에도 문자열만 전달.

## 4. API / 쿼리

- Supabase `.eq('client_id', value)`에 넘기는 값은 항상 `string`.
- CSV/폼에서 올 때: 숫자로 파싱하지 않고, 필요하면 `String(...)`으로 정규화.

## 5. 이유

- **일관성:** 숫자/문자 혼용과 비교·키 버그 방지.
- **앞자리 0:** 예: `"001"`이 `1`로 바뀌면 안 됨.
- **연동:** 문자열 ID를 쓰는 외부 시스템과 맞춤.

## 체크리스트

- [ ] TS 타입에서 `client_id`를 `string`으로 정의했는가?
- [ ] Supabase/RPC 호출 시 `client_id`에 문자열만 넘기는가?
- [ ] CSV/폼 입력에서 `client_id`를 숫자로 변환하지 않는가?

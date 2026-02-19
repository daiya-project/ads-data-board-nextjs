---
description: Supabase 1000행 제한; SELECT .range() 페이지네이션, INSERT는 1000행 단위 배치
globs: "**/*.ts"
---

# 데이터: Supabase 페이지네이션 (1000행 제한)

PostgREST(Supabase API)는 기본적으로 **select당 최대 1000행**만 반환한다. `.limit(10000)`을 써도 서버 기본값이 1000이면 1000으로 제한된다. 1000행을 넘을 수 있는 조회나 대량 INSERT에는 아래 규칙을 적용한다.

## 1. 제한

| 연산 | 제한 | 방식 |
|------|------|------|
| **SELECT** | 요청당 기본 최대 1000행 | `.range(from, to)` 페이지네이션 (순차 또는 병렬) |
| **INSERT** | 대량 크기 제한 | 1000행 단위로 나누어 `insert(batch)`를 반복 호출 |

## 2. SELECT — 페이지네이션 요구 사항

1. **`.range(from, to)` 사용** — `from = offset`, `to = offset + pageSize - 1` (예: 페이지당 1000).
2. **`.order(...)` 동일 유지** — 모든 페이지에서 같은 정렬로 순서가 일정하게 유지되도록.
3. **종료 조건** — 반환된 길이 < pageSize이면 마지막 페이지.

## 3. 순차 페이지네이션

```typescript
const PAGE_SIZE = 1000;
let page = 0;
let hasMore = true;
const allRows: Row[] = [];

while (hasMore) {
  const from = page * PAGE_SIZE;
  const to = (page + 1) * PAGE_SIZE - 1;

  const { data: rows, error } = await supabase
    .from('your_table')
    .select('*')
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw error;
  allRows.push(...(rows ?? []));
  hasMore = (rows?.length ?? 0) === PAGE_SIZE;
  page += 1;
}
```

## 4. 병렬 페이지네이션

한 라운드에 여러 페이지를 요청한 뒤 offset을 진행.

```typescript
const PAGE_SIZE = 1000;
const PARALLEL_PAGES = 4;
let offset = 0;
const allRows: Row[] = [];

while (true) {
  const promises = Array.from({ length: PARALLEL_PAGES }, (_, i) => {
    const from = offset + i * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    return supabase
      .from('your_table')
      .select('*')
      .order('client_id', { ascending: true })
      .order('date', { ascending: false })
      .range(from, to);
  });

  const results = await Promise.all(promises);
  let hasMore = false;
  for (const res of results) {
    const rows = res.data ?? [];
    allRows.push(...rows);
    if (rows.length === PAGE_SIZE) hasMore = true;
  }
  if (!hasMore) break;
  offset += PARALLEL_PAGES * PAGE_SIZE;
}
```

## 5. INSERT — 1000행 단위 배치

대량 INSERT는 **1000행 단위 배치**로 나누어 `insert(batch)`를 반복 호출한다.

```typescript
const BATCH_SIZE = 1000;
const batches: Row[][] = [];
for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
  batches.push(recordsToInsert.slice(i, i + BATCH_SIZE));
}

for (let i = 0; i < batches.length; i++) {
  const { error } = await supabase.from('your_table').insert(batches[i]);
  if (error) throw new Error(`Batch ${i + 1} failed: ${error.message}`);
}
```

## 6. 에러 처리

- **항상 `error` 확인:** Supabase 호출 후 `{ data, error }`에서 `data`를 쓰기 전에 `error`를 반드시 확인한다. 성공이라고 가정하지 않는다.
- **데이터 계층에서 throw:** `lib/api`(또는 이에 상응하는 데이터 계층) 함수에서는 명확한 사용자용 메시지를 담은 표준 `Error`를 던진다. UI 컴포넌트가 catch하여 Toast나 에러 상태로 보여줄 수 있다. 디버깅용으로 `console.error` 로깅은 선택 사항.
- **UI는 조용히 실패하지 않는다:** 해당 API를 호출하는 컴포넌트는 에러를 처리하고(try/catch) Toast, 에러 상태, 인라인 메시지 등으로 피드백을 제공해야 한다. catch한 에러를 무시하지 않는다.

```typescript
// ✅ 데이터 계층: error 확인 후 throw
const { data, error } = await supabase.from('your_table').select('*').range(0, 999);
if (error) {
  console.error('Fetch failed:', error);
  throw new Error(`Failed to load data: ${error.message}`);
}
return data;
```

```typescript
// ❌ 나쁨 — error 무시
const { data } = await supabase.from('t').select();
return data; // null일 수 있고, 호출자에게 신호가 없음
```

```typescript
// ❌ 나쁨 — 로그만 하고 throw 없음
if (error) console.error(error);
return data;
```

## 요약

| 사용처 | 방법 |
|--------|------|
| SELECT 1000행 초과 | 동일 `.order()` + `.range(from, to)`를 루프(순차 또는 병렬) |
| 대량 INSERT | 1000행 단위로 나누어 배치마다 `insert(batch)` |
| 에러 | 매 호출 후 `error` 확인; 데이터 계층에서 throw; UI는 Toast 또는 에러 상태 표시 |

## 체크리스트

- [ ] 1000행을 넘을 수 있는 SELECT에 `.limit()`만 쓰지 않고 `.range(from, to)` 페이지네이션을 쓰는가?
- [ ] 모든 페이지에 같은 `.order(...)`를 쓰는가?
- [ ] 대량 INSERT를 1000행 배치로 나누는가?
- [ ] Supabase 호출마다 `error`를 확인하고, 실패 시 표준 `Error`를 throw하는가?
- [ ] API를 호출하는 UI 컴포넌트가 에러를 catch하고 Toast 또는 에러 상태로 피드백을 보여주는가?
- [ ] 필요 시 에러/진행 메시지에 배치 인덱스를 포함하는가?

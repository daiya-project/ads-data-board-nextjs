# Reports Shared Filters

## Document info
- **Created:** 2026-02-20 00:01:00
- **Last updated:** 2026-02-20 00:01:00

## Revision history
| Date | Description |
|------|-------------|
| 2026-02-20 00:01:00 | Initial version. Phase 1 공통 인프라 정리에서 생성. |

## Covered files
Files documented by this doc. **When you modify any of these, update this doc** (Last updated, Revision history, and content if behavior/state changed).

| Path | Role |
|------|------|
| `@/lib/features/reports/shared-filters.ts` | 검색 필터 순수 함수 |

## 1. Overview
- **Path:** `lib/features/reports/shared-filters.ts`
- **Purpose:** 일별/주별 리포트에서 클라이언트 목록을 검색어로 필터링하는 제네릭 순수 함수를 제공합니다.

## 2. Key Props & State

### Function: `applySearchFilter<T>`

#### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `items` | `T[]` | 필터링할 아이템 배열 |
| `searchValue` | `string` | 검색 문자열 (쉼표로 구분된 다중 검색어 지원) |
| `getSearchText` | `(item: T) => string` | 각 아이템에서 검색 대상 텍스트를 추출하는 함수 |

#### Returns
- `T[]` — 필터링된 아이템 배열

#### State
- **상태 없음** — 순수 함수 (Pure Function)

## 3. Core Logic & Interactions

### 검색 로직 흐름

1. **입력 정규화**
   - `searchValue`를 trim하여 공백 제거
   - 빈 문자열이면 원본 배열을 그대로 반환

2. **검색어 파싱**
   - 쉼표(`,`)로 split하여 개별 검색어 추출
   - 각 검색어를 trim + lowercase 변환
   - 빈 검색어는 제거

3. **필터링 적용**
   - 각 아이템에 대해 `getSearchText` 함수로 검색 대상 텍스트 추출
   - 추출된 텍스트를 lowercase로 변환
   - **OR 로직:** 검색어 중 **하나라도** 포함되면 필터 통과
   - `Array.prototype.some`으로 구현

### 검색어 매칭 규칙

- **다중 검색어:** 쉼표로 구분 (예: `"001, ABC"`)
- **부분 일치:** `includes` 사용 (예: `"AB"`는 `"ABC Corp"` 매칭)
- **대소문자 무시:** 모든 비교는 lowercase로 변환 후 수행
- **OR 로직:** 여러 검색어 중 하나만 일치해도 결과에 포함

### 예시

```typescript
const clients = [
  { client_id: "001", client_name: "ABC Corp" },
  { client_id: "002", client_name: "XYZ Ltd" },
  { client_id: "003", client_name: "ABC Ltd" },
];

// 단일 검색어
applySearchFilter(clients, "abc", (c) => `${c.client_id} ${c.client_name}`);
// 결과: [{ client_id: "001", ... }, { client_id: "003", ... }]

// 다중 검색어 (OR)
applySearchFilter(clients, "001, xyz", (c) => `${c.client_id} ${c.client_name}`);
// 결과: [{ client_id: "001", ... }, { client_id: "002", ... }]

// 빈 검색어
applySearchFilter(clients, "", (c) => c.client_name);
// 결과: 전체 배열 (필터링 없음)
```

## 4. AI Implementation Guide (For vibe coding)

### State → Action → Implementation (required)

| State / condition | Meaning | Use this function / API | Where to implement |
|-------------------|---------|-------------------------|--------------------|
| 검색어 입력됨 (단일) | 사용자가 검색어 하나를 입력 | `applySearchFilter(items, searchValue, getSearchText)` | 검색 input의 onChange 핸들러 또는 필터 state 변경 시 |
| 검색어 입력됨 (다중, 쉼표 구분) | 사용자가 "A, B, C" 형식으로 여러 검색어 입력 | `applySearchFilter(items, searchValue, getSearchText)` | 동일 — 함수가 자동으로 쉼표 split |
| 검색어 비어있음 | 검색창이 비어있거나 공백만 입력 | `applySearchFilter(items, "", getSearchText)` | 함수가 원본 배열을 그대로 반환 |
| 대소문자 구분 없이 검색 | 사용자가 "abc" 입력 시 "ABC" 매칭 필요 | `applySearchFilter` 내부에서 자동 처리 | 함수 내부 로직 (lowercase 변환) |

### Modification rules

#### 검색 로직 변경이 필요한 경우

| 요구사항 | 수정 위치 | 방법 |
|---------|----------|------|
| **AND 로직으로 변경** (모든 검색어 포함) | `applySearchFilter` 내부 `return items.filter(...)` | `terms.some(...)` → `terms.every(...)` |
| **정확히 일치만 허용** (부분 일치 제거) | `applySearchFilter` 내부 매칭 로직 | `searchText.includes(term)` → `searchText === term` |
| **구분자 변경** (쉼표 → 공백) | `applySearchFilter` 내부 split 로직 | `.split(",")` → `.split(" ")` 또는 정규식 `.split(/\s+/)` |
| **대소문자 구분** | `applySearchFilter` 내부 정규화 로직 | `.toLowerCase()` 제거 |

### Dependencies

- **없음** — 외부 라이브러리나 다른 모듈에 의존하지 않는 순수 함수

### Usage in Components

```typescript
// ReportFilters.tsx 예시
const [searchValue, setSearchValue] = useState("");
const [allClients, setAllClients] = useState<DailyReportRow[]>([]);

const filteredClients = applySearchFilter(
  allClients,
  searchValue,
  (client) => `${client.client_id} ${client.client_name}`
);

return (
  <input
    type="text"
    placeholder="Client ID, Name (쉼표로 구분)"
    value={searchValue}
    onChange={(e) => setSearchValue(e.target.value)}
  />
);
```

## 5. Edge Cases

### 입력 검증
- **`searchValue`가 `undefined` 또는 `null`:** `?? ""` 처리로 빈 문자열로 변환 → 원본 배열 반환
- **공백만 입력:** `trim()` 후 빈 문자열 체크 → 원본 배열 반환
- **쉼표만 입력 (`,,,`):** split 후 빈 문자열 제거 → `terms.length === 0` → 원본 배열 반환
- **특수문자 포함:** 그대로 검색어로 사용 (별도 escape 없음)

### 성능
- **대량 데이터:** `items` 배열 크기에 비례하여 O(n × m) (n: 아이템 수, m: 검색어 수)
- **최적화 권장:** 10,000개 이상의 아이템에서는 debounce 적용 권장

### 국제화 (i18n)
- **로케일 고려 안 함:** 단순 `toLowerCase()` 사용
- **한글/중문/일문:** 정상 동작 (JavaScript의 Unicode 지원)
- **특수 문자 정규화:** 별도 구현 필요 (예: `"café"` vs `"cafe"`)

## 6. Testing Checklist

- [ ] 단일 검색어 정상 작동
- [ ] 다중 검색어 (쉼표 구분) OR 로직 작동
- [ ] 빈 검색어 시 전체 데이터 반환
- [ ] 대소문자 무시 확인
- [ ] 공백 처리 (앞뒤, 중간) 확인
- [ ] 특수문자 검색 정상 작동
- [ ] 매칭 없을 때 빈 배열 반환
- [ ] `getSearchText` 함수가 제대로 호출되는지 확인

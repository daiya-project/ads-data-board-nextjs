# Managers API

## Document info
- **Created:** 2026-02-20 00:02:00
- **Last updated:** 2026-02-20 00:02:00

## Revision history
| Date | Description |
|------|-------------|
| 2026-02-20 00:02:00 | Initial version. Phase 1 공통 인프라 정리에서 생성. |

## Covered files
Files documented by this doc. **When you modify any of these, update this doc** (Last updated, Revision history, and content if behavior/state changed).

| Path | Role |
|------|------|
| `@/lib/api/managers.ts` | 담당자 목록 조회 및 담당자별 클라이언트 필터링 API |

## 1. Overview
- **Path:** `lib/api/managers.ts`
- **Purpose:** 리포트 필터링을 위해 담당자(매니저) 목록을 조회하고, 특정 담당자가 관리하는 클라이언트 ID 목록을 반환합니다.

## 2. Key Props & State

### Type: `ManagerRow`

```typescript
interface ManagerRow {
  id: number;
  manager_name: string;
}
```

### Function 1: `getManagerList()`

#### Parameters
- **없음** — Supabase 클라이언트는 내부에서 생성

#### Returns
- `Promise<ManagerRow[] | null>`
  - 성공: 담당자 배열 (빈 배열 가능)
  - 실패: `null`

#### State
- **상태 없음** — 비동기 함수, 캐싱 없음 (필요 시 호출자가 구현)

### Function 2: `getClientIdsByManagerFilter()`

#### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `supabase` | `SupabaseClient` | Supabase 클라이언트 인스턴스 (외부 주입) |
| `filterValue` | `string` | 담당자 ID (단일 또는 쉼표 구분 다중) |

#### Returns
- `Promise<Set<string>>`
  - 성공: `client_id` 문자열 Set (빈 Set 가능)
  - 실패: 빈 Set

#### State
- **상태 없음** — 순수 비동기 함수

## 3. Core Logic & Interactions

### Function 1: `getManagerList()` 로직

1. **Supabase 클라이언트 생성**
   - `createClient()` 호출 (클라이언트 측 Supabase)

2. **DB 쿼리 실행**
   - 스키마: `shared`
   - 테이블: `manager`
   - 필터: `manager_team = 'ads'` (ads 팀 담당자만)
   - 정렬: `id` 오름차순

3. **에러 처리**
   - 에러 발생 시 콘솔 로그 출력 후 `null` 반환
   - 데이터 없으면 빈 배열 반환

### Function 2: `getClientIdsByManagerFilter()` 로직

#### Step 1: 입력 검증 및 파싱

```
filterValue 입력
  ↓
trim 처리
  ↓
빈 문자열? → YES → return new Set()
  ↓ NO
쉼표 포함?
  ↓ YES → split(",") + parseInt + filter
  ↓ NO → parseInt 단일 값
  ↓
managerIds: number[]
```

#### Step 2: 쿼리 빌드 (특수 케이스 처리)

```typescript
// 기본 쿼리
query = supabase
  .schema("ads")
  .from("client")
  .select("client_id")
  .not("manager_id", "is", null);

// 조건 분기
if (managerIds.includes(99)) {
  // 99 포함 시: OR 조건 (manager_id = 99 OR manager_id IS NULL)
  query = query.or("manager_id.eq.99,manager_id.is.null");
} else if (managerIds.length === 1) {
  // 단일 ID: eq
  query = query.eq("manager_id", managerIds[0]);
} else {
  // 다중 ID: in
  query = query.in("manager_id", managerIds);
}
```

#### Step 3: 결과 변환

- DB 결과를 `Set<string>`으로 변환
- **중요:** `client_id`를 **string**으로 변환 (`40-data-main-rule` 준수)
- 에러 또는 데이터 없으면 빈 Set 반환

### 특수 비즈니스 규칙: manager_id = 99

**규칙:** `manager_id = 99`는 "미배정" 또는 "공통" 담당자를 의미하며, `manager_id IS NULL`인 클라이언트도 함께 포함합니다.

**구현:**
```typescript
if (managerIds.includes(99)) {
  const orConditions = managerIds.map((id) => `manager_id.eq.${id}`).join(",");
  query = query.or(`${orConditions},manager_id.is.null`);
}
```

**예시:**
- `filterValue = "99"` → `manager_id = 99` OR `manager_id IS NULL`
- `filterValue = "1,99"` → `manager_id IN (1, 99)` OR `manager_id IS NULL`

## 4. AI Implementation Guide (For vibe coding)

### State → Action → Implementation (required)

| State / condition | Meaning | Use this function / API | Where to implement |
|-------------------|---------|-------------------------|--------------------|
| 리포트 필터 초기화 (담당자 목록 필요) | 담당자 select 옵션 구성 | `getManagerList()` | 페이지/컴포넌트 mount 시 또는 Server Component에서 호출 |
| 사용자가 담당자 선택 (단일) | 특정 담당자의 클라이언트만 필터링 | `getClientIdsByManagerFilter(supabase, "1")` | 담당자 select onChange 핸들러 또는 필터 적용 함수 |
| 사용자가 다중 담당자 선택 | 여러 담당자의 클라이언트 필터링 | `getClientIdsByManagerFilter(supabase, "1,2,3")` | 다중 select 또는 체크박스 선택값을 쉼표로 join |
| "미배정" 담당자 포함 필터 | manager_id = 99 + NULL 포함 | `getClientIdsByManagerFilter(supabase, "99")` | 99 ID를 포함한 필터 값 전달 |
| 담당자 필터 해제 | 전체 클라이언트 표시 | 함수 호출 안 함 | filterValue = "" 또는 담당자 필터 state를 null로 설정 |

### Modification rules

#### 담당자 API 수정이 필요한 경우

| 요구사항 | 수정 위치 | 방법 |
|---------|----------|------|
| **캐싱 추가** | `getManagerList` 함수 | React Query, SWR, 또는 모듈 레벨 캐시 추가 |
| **다른 팀 담당자 조회** | `getManagerList` 쿼리 | `.eq("manager_team", "ads")` → 파라미터로 변경 |
| **특수 규칙 변경 (99 → 다른 ID)** | `getClientIdsByManagerFilter` 조건 분기 | `managerIds.includes(99)` → 다른 ID로 변경 |
| **client_id 타입 변경 (string → number)** | `getClientIdsByManagerFilter` 반환 변환 | `String(...)` 제거 — **주의:** `40-data-main-rule` 위반! |
| **sales_manager_id도 필터링** | `getClientIdsByManagerFilter` 쿼리 | `.or("manager_id.in.(...),sales_manager_id.in.(...)")` 추가 |

### Dependencies

| Module | Usage |
|--------|-------|
| `@/lib/supabase/client` | `createClient()` — Supabase 클라이언트 생성 |
| `@supabase/supabase-js` | `SupabaseClient` 타입 |

### Usage in Components

#### Server Component 예시

```typescript
// app/(dashboard)/reports/daily/page.tsx
import { getManagerList } from "@/lib/api/managers";

export default async function DailyReportPage() {
  const managers = await getManagerList();
  
  return (
    <DailyReportClient managers={managers ?? []} />
  );
}
```

#### Client Component 예시

```typescript
// components/features/reports/ReportFilters.tsx
"use client";

import { useState, useEffect } from "react";
import { getClientIdsByManagerFilter } from "@/lib/api/managers";
import { createClient } from "@/lib/supabase/client";

export function ReportFilters({ onFilterChange }: Props) {
  const [selectedManagerId, setSelectedManagerId] = useState("");
  
  useEffect(() => {
    if (!selectedManagerId) return;
    
    const supabase = createClient();
    getClientIdsByManagerFilter(supabase, selectedManagerId).then((clientIds) => {
      onFilterChange({ clientIds });
    });
  }, [selectedManagerId, onFilterChange]);
  
  return (
    <select
      value={selectedManagerId}
      onChange={(e) => setSelectedManagerId(e.target.value)}
    >
      <option value="">전체 담당자</option>
      {/* 담당자 옵션 */}
    </select>
  );
}
```

## 5. Edge Cases

### `getManagerList()` Edge Cases

| Case | Behavior |
|------|----------|
| DB 연결 실패 | `null` 반환, 콘솔 에러 로그 |
| 담당자 없음 (빈 결과) | 빈 배열 `[]` 반환 |
| `manager_team = 'ads'` 없음 | 빈 배열 `[]` 반환 |
| Supabase 클라이언트 생성 실패 | 예외 발생 (try-catch 권장) |

### `getClientIdsByManagerFilter()` Edge Cases

| Case | Behavior |
|------|----------|
| `filterValue = ""`<br/>`filterValue = "   "` | 빈 Set 반환 (필터링 안 함) |
| `filterValue = "abc"` (숫자 아님) | `parseInt` 실패 → 빈 Set 반환 |
| `filterValue = "1,2,abc,3"` | 유효한 숫자만 추출 (`[1, 2, 3]`) → 정상 필터링 |
| `filterValue = "999"` (존재하지 않는 ID) | 빈 Set 반환 (매칭 없음) |
| `filterValue = "99"` (특수 규칙) | `manager_id = 99` + `manager_id IS NULL` 클라이언트 포함 |
| `filterValue = "1,99"` | `manager_id IN (1, 99)` + `manager_id IS NULL` 클라이언트 포함 |
| DB 에러 (권한, 네트워크) | 빈 Set 반환, 콘솔 에러 로그 |
| `client_id`가 number로 저장됨 | `String(...)` 변환으로 안전하게 처리 |

## 6. Database Schema Reference

### `shared.manager` 테이블

| Column | Type | Description |
|--------|------|-------------|
| `id` | `INTEGER` | PK, 담당자 ID |
| `manager_name` | `TEXT` | 담당자명 |
| `manager_team` | `TEXT` | 팀 (예: "ads") |

### `ads.client` 테이블

| Column | Type | Description |
|--------|------|-------------|
| `client_id` | `TEXT` | PK, 클라이언트 ID (string, 40-data-main-rule) |
| `client_name` | `TEXT` | 클라이언트명 |
| `manager_id` | `INTEGER` | FK → `shared.manager.id` (NULL 가능) |
| `sales_manager_id` | `INTEGER` | FK → `shared.manager.id` (NULL 가능) |

## 7. Business Rules

### 담당자 ID 특수 규칙

- **99번 담당자:** "미배정" 또는 "공통" 담당자
- **NULL manager_id:** 담당자가 배정되지 않은 클라이언트
- **규칙:** 99번 필터 시 NULL도 함께 조회

### client_id 타입 규칙 (40-data-main-rule)

- **DB:** `TEXT` (선행 0 유지, 예: `"001"`)
- **API 반환:** **string** (예: `"001"`)
- **절대 금지:** number로 변환 (`001` → `1`이 되면 안 됨)

## 8. Testing Checklist

### `getManagerList()`
- [ ] ads 팀 담당자만 조회
- [ ] id 오름차순 정렬 확인
- [ ] 빈 결과 시 빈 배열 반환
- [ ] DB 에러 시 `null` 반환 + 로그 출력

### `getClientIdsByManagerFilter()`
- [ ] 단일 담당자 ID 필터링
- [ ] 다중 담당자 ID (쉼표 구분) 필터링
- [ ] 99번 담당자 + NULL 포함 확인
- [ ] 유효하지 않은 ID 입력 시 빈 Set 반환
- [ ] 빈 문자열 입력 시 빈 Set 반환
- [ ] `client_id`가 string으로 반환되는지 확인
- [ ] DB 에러 시 빈 Set 반환 + 로그 출력

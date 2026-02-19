---
description: 프로젝트 내부 공용 컴포넌트·lib 우선 사용; 나열한 핵심 외부 라이브러리만 사용. 대체 라이브러리 도입 금지.
globs: "**/*.{ts,tsx}"
---

# 공용 컴포넌트 및 Lib (코딩 시 우선 사용)

기능 구현 시 아래 **공용 컴포넌트와 내부 lib 모듈을 우선 사용**한다. 같은 동작을 인라인으로 다시 구현하지 않는다 (숫자/퍼센트 포맷, 날짜·분기 유틸, className 병합 등). **핵심 외부 라이브러리**는 이 규칙에 나열한 것만 사용하며, 겹치는 역할의 다른 라이브러리는 추가·제안하지 않는다.

## 0. 핵심 외부 라이브러리 (이것만 사용 — 대체 도입 금지)

프로젝트에서 선택한 스택이다. **강하게 권장:** 아래 용도에는 반드시 해당 라이브러리를 사용한다. 같은 역할을 하는 다른 라이브러리는 도입하지 않는다 (예: 상태 관리에 Zustand를 쓰면 Redux/MobX/Jotai 사용 금지).

| 용도               | 라이브러리                               | 사용처                                                                                  |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| **프레임워크**     | Next.js, React                           | App Router, Server/Client 컴포넌트, 라우팅, 렌더링.                                     |
| **스타일**         | Tailwind CSS                             | 레이아웃, 간격, 타이포, 색상. 유틸리티 클래스 사용; 임의 CSS 지양.                      |
| **UI 프리미티브**  | Shadcn/ui (Radix UI + Tailwind)          | 버튼, 테이블, 토글, 탭, 다이얼로그 등. `npx shadcn@latest add <component>`로 추가.      |
| **아이콘**         | `lucide-react`                           | 모든 아이콘. 다른 아이콘 라이브러리 추가 금지.                                          |
| **애니메이션**     | `framer-motion`                          | 등장/퇴장, 레이아웃, 제스처 애니메이션. 동일 용도 다른 애니메이션 라이브러리 추가 금지. |
| **백엔드/데이터**  | `@supabase/supabase-js`, `@supabase/ssr` | DB, 인증, 서버/클라이언트 Supabase 클라이언트. 동일 범위의 다른 BaaS·ORM 추가 금지.     |
| **상태 관리**      | Zustand                                  | 전역/클라이언트 상태. Redux, MobX, Jotai 등 사용 금지.                                  |
| **ClassName 유틸** | `clsx`, `tailwind-merge`                 | `@/lib/utils`(cn) 내부 사용. 앱 코드에서는 `@/lib/utils`의 `cn` 사용.                   |

생성하는 모든 코드는 위 기술만 사용한다. 전체 스택 맥락은 `00-project-main.mdc` 참고.

## 1. 공용 UI 컴포넌트

| 구분            | 경로                               | 용도                                              |
| --------------- | ---------------------------------- | ------------------------------------------------- |
| **Common**      | `@/components/common/PageSkeleton` | 전체 페이지 로딩 스켈레톤 (Suspense fallback 등). |
| **UI (Shadcn)** | `@/components/ui/button`           | 버튼.                                             |
|                 | `@/components/ui/skeleton`         | 스켈레톤 플레이스홀더.                            |
|                 | `@/components/ui/table`            | Table, TableHead, TableRow, TableCell, TableBody. |
|                 | `@/components/ui/toggle-group`     | ToggleGroup, ToggleGroupItem.                     |
|                 | `@/components/ui/progress`         | 프로그레스 바.                                    |
|                 | `@/components/ui/tabs`             | 탭.                                               |
|                 | `@/components/ui/dialog`           | 다이얼로그(모달).                                 |
|                 | `@/components/ui/input`            | 텍스트/숫자 입력.                                 |
|                 | `@/components/ui/checkbox`         | 체크박스.                                         |

새 Shadcn 컴포넌트는 `npx shadcn@latest add <component>`로 추가하고, 외부에서 복사해 붙이지 않는다.

## 2. 내부 Lib 모듈 (인라인 로직 대신 우선 사용)

| 경로                        | 용도                                               |
| --------------------------- | -------------------------------------------------- |
| **`@/lib/utils`**           | `cn` — className 병합 (모든 UI 컴포넌트에서 사용). |
| **`@/lib/supabase/server`** | 서버용 Supabase 클라이언트.                        |
| **`@/lib/supabase/client`** | 클라이언트용 Supabase 클라이언트.                  |
| **`@/lib/api/*`**           | 데이터 fetch (예: KPI용 `lib/api/kpi`).            |
| **`@/hooks/*`**             | 공용 훅 (예: `useKpiTableCollapse`).               |
| **`@/stores/*`**            | Zustand 스토어 (예: `dashboardFilterStore`).       |

## 3. 예시

```ts
// ✅ 좋음 — 공용 lib로 숫자/퍼센트
import { formatNumber, formatPercent } from "@/lib/number-utils";
// 테이블 셀·카드에서 formatNumber(value), formatPercent(rate) 사용.
```

```ts
// ✅ 좋음 — 공용 lib로 날짜·분기
import {
  getYearFromMonth,
  getMonthsForYear,
  getYearsFromMonthStrings,
} from "@/lib/date-utils";
// 컬럼 헤더, 연도 네비게이터, 분기 그룹 등에 사용.
```

```ts
// ✅ 좋음 — cn으로 className
import { cn } from "@/lib/utils";
<div className={cn("base", isActive && "active")} />
```

```ts
// ✅ 좋음 — 입력 표시/DB 전 콤마 제거
import {
  formatWithThousandSeparator,
  stripThousandSeparator,
} from "@/lib/string-utils";
// 표시: formatWithThousandSeparator(num). 파싱: parseNumber(stripThousandSeparator(raw)).
```

```ts
// ❌ 나쁨 — 인라인 숫자 포맷
const s = Number.isNaN(n) ? "—" : n.toLocaleString(); // @/lib/number-utils 사용할 것
```

## 4. 체크리스트

- [ ] 핵심 외부 라이브러리만 사용했는가? (Next.js, React, Tailwind, Shadcn, lucide-react, framer-motion, Supabase, Zustand) 겹치는 다른 라이브러리를 추가하지 않았는가?
- [ ] 숫자/퍼센트 표시에 `@/lib/number-utils` 사용했는가?
- [ ] 날짜/분기 로직에 `@/lib/date-utils` 사용했는가?
- [ ] UI는 가능한 경우 `@/components/ui/*`, `@/components/common/*` 사용했는가?
- [ ] className 병합에 `@/lib/utils`의 `cn` 사용했는가?
- [ ] 천 단위 구분자 표시/제거가 필요할 때 `@/lib/string-utils`의 `formatWithThousandSeparator`, `stripThousandSeparator` 사용했는가?

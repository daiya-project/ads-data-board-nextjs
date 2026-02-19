# Next.js 마이그레이션 사전 분석 문서

> **작성일**: 2026-02-19  
> **목적**: 바닐라 TypeScript 프로젝트를 Next.js App Router 방식으로 마이그레이션하기 위한 현황 분석

---

## 1. 애플리케이션의 핵심 비즈니스 로직과 도메인 분리 상태

### 1.1 전체 아키텍처

현재 프로젝트는 **Feature-Sliced Design** 기반의 모듈 구조를 따르고 있습니다:

```
src/
├── app/                    # 앱 진입점 및 전역 설정
│   ├── bootstrap.ts        # 앱 초기화 로직
│   ├── init-globals.ts     # 전역 객체 초기화
│   └── styles/             # 전역 스타일
├── features/               # 비즈니스 도메인별 Feature
│   ├── dashboard/          # 대시보드
│   ├── reports/            # 리포트 (일별/주별)
│   ├── goal-weekly/        # 주간 목표
│   ├── goal-monthly/       # 월간 목표
│   ├── settings/           # 설정
│   └── navigation/         # 라우팅
└── shared/                 # 공통 모듈
    ├── api/                # API 클라이언트
    ├── lib/                # 유틸리티
    ├── ui/                 # 공통 UI 컴포넌트
    └── types/              # 공통 타입 정의
```

### 1.2 핵심 비즈니스 로직

각 Feature는 다음과 같은 내부 구조를 가집니다:

```
features/[feature-name]/
├── components/             # UI 컴포넌트
├── lib/                    # 비즈니스 로직
├── index.ts                # Feature 진입점 (init/destroy)
└── [feature-name].css      # Feature 스타일
```

**주요 Feature 목록**:

1. **Dashboard**: KPI 카드, 매출 차트, 담당자별 실적
2. **Reports**: 일별/주별 매출 리포트, 필터링, 테이블
3. **Goal Weekly**: 주간 목표 등록/조회/수정, 담당자별 탭
4. **Goal Monthly**: 월간 목표, 캘린더, 아웃바운드 차트
5. **Settings**: 담당자 설정, 목표 설정 테이블

### 1.3 도메인 분리 상태

**✅ 잘 분리된 부분**:
- Feature별 폴더 구조로 도메인이 명확히 분리됨
- 각 Feature는 독립적인 `init()` / `destroy()` 생명주기를 가짐
- 공통 로직은 `shared/` 아래로 추출됨

**⚠️ 개선이 필요한 부분**:
- `bootstrap.ts`에 Feature 간 의존성 주입 로직이 밀집되어 있음
- Feature 간 통신이 일부 전역 상태와 콜백에 의존
- 라우팅과 Feature 초기화가 강하게 결합됨

---

## 2. 현재 상태(State)를 관리하는 방식과 데이터 흐름

### 2.1 상태 관리 방식

#### (1) Feature-Local State
각 Feature는 모듈 레벨에서 상태를 관리합니다:

```typescript
// features/goal-weekly/lib/state.ts
export const weeklyGoalState: WeeklyGoalMainState = {
  currentManagerTabId: null,
  datePickerState: { ... },
  weekNavigationState: { ... },
  allWeeksData: null,
  currentContentArea: null,
  currentShowSummary: false
};
```

```typescript
// features/goal-monthly/lib/state.ts
export const state: MonthlyViewState = {
  selectedMonth: getDefaultMonth(),
  selectedManagerId: null,
};
```

#### (2) 전역 Window 객체를 통한 상태 노출
일부 상태는 디버깅 및 Feature 간 통신을 위해 `window` 객체에 노출됩니다:

```typescript
declare global {
  interface Window {
    weeklyGoalState?: WeeklyGoalMainState;
    supabase?: SupabaseClient;
    goalRegisterContext?: GoalRegisterContext;
  }
}
```

#### (3) Event Bus를 통한 Feature 간 통신
타입 안전한 이벤트 버스를 사용합니다:

```typescript
// shared/lib/event-bus.ts
export interface GoalEventMap {
  'goal:modal:close-requested': void;
  'goal:modal:closed': void;
  'goal:submitted': { goalId?: number };
  'goal:category-dropdown:update': { value: string };
}

emit('goal:submitted', { goalId: 123 });
on('goal:submitted', (detail) => { ... });
```

#### (4) 캐시 시스템
데이터 및 DOM 요소 캐싱:

```typescript
// shared/lib/cache.ts
export const cache = {
  shared_manager: { data: null, timestamp: null, ttl: 5 * 60 * 1000 },
  clients: new Map<string, CacheEntry<unknown[]>>(),
  dailyReport: { data: null, dateRange: null, timestamp: null },
  weeklyReport: { data: null, weeks: null, timestamp: null },
  domElements: new Map<string, Element | Element[]>(),
};
```

### 2.2 데이터 흐름

```
User Action
    ↓
Event Handler (Component)
    ↓
Business Logic (lib/)
    ↓
API Call (shared/api/)
    ↓
Supabase Client
    ↓
State Update (Feature State)
    ↓
Event Emission (event-bus)
    ↓
UI Re-render (Component.render())
```

**특징**:
- **단방향 데이터 흐름**: 사용자 액션 → 로직 → API → 상태 → UI
- **명령형 UI 업데이트**: DOM을 직접 조작하여 UI를 갱신
- **캐시 레이어**: API 응답을 TTL 기반으로 캐싱
- **Request Manager**: 중복 요청 방지 및 요청 큐 관리

---

## 3. 현재 구현된 라우팅 처리 방식 (화면 전환 방식)

### 3.1 라우터 아키텍처

**Client-Side Routing** 방식으로 구현되어 있습니다:

#### 구조
```
features/navigation/
├── lib/
│   ├── router.ts           # 라우팅 핵심 로직
│   ├── route-config.ts     # 라우트 정의 및 동적 import
│   └── types.ts            # 라우터 타입
└── index.ts                # 라우터 초기화
```

### 3.2 라우팅 메커니즘

#### (1) Page Navigation (메인 페이지)
```typescript
// Sidebar 클릭 시
navItem.addEventListener('click', function() {
  const pageId = this.getAttribute('data-page');
  // 페이지 전환
  pages.forEach(page => page.classList.remove('active'));
  targetPage.classList.add('active');
  
  // 이전 Feature destroy
  await runCurrentDestroy();
  
  // 새 Feature 동적 로드 및 init
  const mod = await featureLoaders[pageId]();
  mod.initDashboardPage(); // or initReportsPage(), etc.
  currentFeature = { destroy: mod.destroy };
});
```

#### (2) Sub-Page Navigation (하위 페이지)
```typescript
// Sub 메뉴 클릭 시
subItem.addEventListener('click', function() {
  const pageId = parentNavItem.getAttribute('data-page');
  const subPageId = this.getAttribute('data-sub-page');
  
  // 탭 전환
  tabContents.forEach(c => c.classList.remove('active'));
  targetTab.classList.add('active');
  
  // 해당 Feature 로드
  const mod = await featureLoaders[`${pageId}/${subPageId}`]();
  mod.initReportsPage();
});
```

### 3.3 코드 스플리팅 (Dynamic Import)

```typescript
// features/navigation/lib/route-config.ts
export const featureLoaders: Record<string, FeatureLoader> = {
  'dashboard': () => import('../../dashboard'),
  'sales-report': () => import('../../reports'),
  'sales-report/daily': () => import('../../reports'),
  'sales-report/weekly': () => import('../../reports'),
  'goal/monthly': () => import('../../goal-monthly'),
  'goal/weekly': () => import('../../goal-weekly'),
  'setting/goal-setting': () => import('../../settings'),
  'setting/manager-setting': () => import('../../settings'),
};
```

각 Feature는 필요한 시점에만 로드됩니다.

### 3.4 라우트 → Feature 생명주기

```
Page Activate
    ↓
[1] runCurrentDestroy()         # 이전 Feature cleanup
    ↓
[2] Dynamic Import              # 새 Feature 코드 로드
    ↓
[3] mod.init() / mod.initXxxPage()  # Feature 초기화
    ↓
[4] Store destroy callback      # destroy 함수 보관
```

**Feature 생명주기 관리**:
```typescript
let currentFeature: CurrentFeatureHandle = {};

async function runCurrentDestroy() {
  if (currentFeature.destroy) {
    currentFeature.destroy();
    currentFeature = {};
  }
}
```

### 3.5 AppShell (레이아웃)

```typescript
// shared/ui/common/AppShell/AppShell.ts
export class AppShell {
  render(container: HTMLElement): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-container';
    
    // Sidebar
    const sidebarMount = document.createElement('div');
    this.sidebar = new Sidebar();
    this.sidebar.render(sidebarMount);
    
    // Main Content Area (페이지별 컨테이너)
    const mainHtml = `
      <main class="main-content" id="main-content">
        <div class="page active" id="dashboard-page"></div>
        <div class="page" id="sales-report-page"></div>
        <div class="page" id="goal-page">...</div>
        <div class="page" id="setting-page"></div>
      </main>
    `;
    wrapper.insertAdjacentHTML('beforeend', mainHtml);
    container.appendChild(wrapper);
  }
}
```

페이지 컨테이너는 미리 생성되고, `.active` 클래스로 가시성을 전환합니다.

---

## 4. 외부 API 통신 방식 및 주요 의존성

### 4.1 API 통신 방식

#### (1) Supabase Client
```typescript
// shared/api/supabase-client.ts
declare global {
  interface Window {
    supabase?: SupabaseClient;
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!window.supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }
  return window.supabase;
}
```

**초기화 위치**: `app/init-globals.ts`에서 환경 변수를 이용해 Supabase 클라이언트를 생성하고 `window.supabase`에 할당.

#### (2) API 레이어 구조
```
shared/api/
├── supabase-client.ts      # Supabase 클라이언트 래퍼
├── api.ts                  # 범용 API 함수 (fetchSharedManagers 등)
├── goal-api.ts             # 목표 관련 API
└── report-api.ts           # 리포트 관련 API
```

**API 호출 예시**:
```typescript
// shared/api/api.ts
export async function fetchSharedManagers(): Promise<SharedManager[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('shared_manager')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}
```

#### (3) Request Manager (중복 요청 방지)
```typescript
// shared/lib/request-manager.ts
export const requestManager = {
  pendingRequests: new Map<string, Promise<unknown>>(),
  pendingCount: 0,
  
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }
    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
      this.pendingCount--;
    });
    this.pendingRequests.set(key, promise);
    this.pendingCount++;
    return promise;
  }
};
```

### 4.2 주요 의존성 (Dependencies)

#### package.json
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.95.3",
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.4.0"
  }
}
```

#### 의존성 분석

| 패키지 | 용도 | 마이그레이션 시 처리 방안 |
|--------|------|--------------------------|
| `@supabase/supabase-js` | Backend API 통신 | Next.js에서 Server/Client Component 분리 필요 |
| `chart.js` | 차트 렌더링 (Canvas) | Client Component로 유지 |
| `vite` | 빌드 도구 | Next.js로 대체 |
| `typescript` | 타입 체크 | 그대로 유지 |

#### Path Alias (tsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"]
    }
  }
}
```

Next.js에서 `@/` 형태로 통합하거나 기존 alias를 유지할 수 있습니다.

### 4.3 데이터 모델 (Database Schema)

주요 테이블:
- `ads_data_daily`: 일별 광고 데이터
- `ads_data_client`: 클라이언트 정보
- `shared_manager`: 담당자 정보
- `shared_week`: 주차 정보
- `shared_holiday`: 공휴일 정보
- `goal_weekly`: 주간 목표
- `goal_monthly`: 월간 목표

**특징**:
- `client_id`는 **문자열 타입**으로 통일 (선행 0 보존)
- `date` 필드는 `YYYY-MM-DD` 형식
- 주차 계산은 `shared_week` 테이블 기준
- 휴일 판단은 `shared_holiday` 또는 `is_holiday` 컬럼 사용

---

## 5. 스타일링 방식

### 5.1 CSS 아키텍처

```
src/app/styles/
├── base/                   # 기본 스타일
│   ├── reset.css           # CSS Reset
│   ├── typography.css      # 타이포그래피
│   ├── buttons.css         # 버튼 스타일
│   ├── layout.css          # 레이아웃
│   └── utilities.css       # 유틸리티 클래스
├── tokens/                 # 디자인 토큰
│   ├── colors.css          # 색상 변수
│   ├── spacing.css         # 간격 변수
│   ├── shadows.css         # 그림자 변수
│   └── typography.css      # 타이포그래피 변수
├── utils/                  # 유틸리티
│   └── tooltip.css         # 툴팁 스타일
└── main.css                # 전역 스타일 진입점
```

### 5.2 Component-Scoped CSS

각 Component/Feature는 고유한 CSS 파일을 가집니다:

```
features/dashboard/
├── dashboard-page.css                    # Feature 레벨 스타일
└── components/
    ├── KpiCard/
    │   ├── KpiCard.ts
    │   └── KpiCard.css                   # Component 스타일
    └── RevenueChart/
        ├── RevenueChart.ts
        └── RevenueChart.css
```

**명명 규칙**:
```css
/* BEM 스타일 + Feature 접두사 */
.KpiCard { ... }
.KpiCard__grid { ... }
.KpiCard__value { ... }

.Dashboard-KpiCard__value { ... }  /* Feature-Component__Element */
```

### 5.3 CSS 변수 활용

```css
/* tokens/colors.css */
:root {
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-text-primary: #1f2937;
  --color-bg-card: #ffffff;
}
```

---

## 6. 빌드 및 개발 환경

### 6.1 진입점
```typescript
// src/main.ts
import './app/init-globals';
import './app/styles/main.css';
import './app/shared-ui-styles';
import '@shared/lib';
import { runApp } from './app/bootstrap';

document.addEventListener('DOMContentLoaded', runApp);
```

### 6.2 앱 초기화 흐름

```
main.ts
    ↓
init-globals.ts             # Supabase, Chart.js 초기화
    ↓
bootstrap.ts > runApp()
    ↓
[1] AppShell 렌더링          # 레이아웃 생성
[2] Modal 렌더링             # 전역 모달 등록
[3] Cache 초기화             # DOM/Data 캐시
[4] Event 설정               # 전역 이벤트 리스너
[5] Router 초기화            # 라우팅 시작
    ↓
runInitialPageActivation()  # 첫 페이지 로드
```

### 6.3 개발 스크립트

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "update-types": "npx supabase gen types typescript ..."
  }
}
```

---

## 7. 마이그레이션 시 고려사항

### 7.1 강점 (Next.js에 유리한 부분)
✅ **Feature-Sliced Design**: Next.js App Router의 폴더 기반 라우팅과 호환성 높음  
✅ **코드 스플리팅**: 이미 동적 import 적용되어 있음  
✅ **명확한 생명주기**: `init()` / `destroy()` 패턴을 Server/Client Component로 전환 가능  
✅ **타입 안전성**: TypeScript 전반적으로 잘 적용됨  
✅ **모듈 분리**: API, UI, 비즈니스 로직이 명확히 분리됨  

### 7.2 과제 (마이그레이션 시 변경 필요)
⚠️ **명령형 UI 업데이트**: React의 선언형 패러다임으로 전환 필요  
⚠️ **전역 상태 관리**: `window` 객체 의존성 제거, React Context/Zustand로 대체  
⚠️ **DOM 직접 조작**: `querySelector`, `innerHTML` 등을 React 방식으로 전환  
⚠️ **라우터 로직**: Next.js App Router로 전환, 파일 시스템 기반 라우팅 적용  
⚠️ **Supabase 클라이언트**: Server Component에서는 Server-Side Client 사용 필요  
⚠️ **Chart.js**: Canvas 기반이므로 Client Component로 유지  
⚠️ **Event Bus**: React의 Props/Context로 대체 가능  

### 7.3 우선순위 제안

**Phase 1**: 프로젝트 셋업 및 공통 모듈 마이그레이션
- Next.js 프로젝트 생성
- `shared/api`, `shared/lib`, `shared/types` 이관
- Supabase Client 설정 (Server/Client 분리)

**Phase 2**: 레이아웃 및 라우팅
- AppShell → Next.js Layout
- Sidebar → Navigation Component
- 라우트 파일 구조 설계

**Phase 3**: Feature 단위 마이그레이션
- Dashboard (비교적 단순)
- Reports (복잡한 필터링 로직)
- Goal Weekly/Monthly (상태 관리 복잡)
- Settings (CRUD 로직)

**Phase 4**: 최적화 및 테스트
- SSR/SSG 적용 검토
- 성능 최적화
- E2E 테스트 구축

---

## 8. 기술 스택 비교

| 항목 | 현재 (Vanilla TS) | Next.js 이후 |
|------|------------------|--------------|
| **프레임워크** | Vite + TypeScript | Next.js 14+ (App Router) |
| **라우팅** | Custom Router (Client-Side) | File-based Routing (App Router) |
| **상태 관리** | Module State + Event Bus | React Context / Zustand |
| **UI 렌더링** | 명령형 (DOM 직접 조작) | 선언형 (React Components) |
| **스타일링** | Plain CSS (BEM) | CSS Modules / Tailwind / Plain CSS |
| **코드 스플리팅** | Dynamic Import (Vite) | Automatic (Next.js) |
| **API 통신** | Supabase Client (Client-Side) | Server Components + Client Components |
| **빌드 도구** | Vite | Next.js (Turbopack/Webpack) |

---

## 부록: 주요 파일 경로 매핑 (참고용)

| 현재 경로 | 설명 | Next.js 예상 경로 |
|----------|------|------------------|
| `src/main.ts` | 앱 진입점 | `app/layout.tsx` |
| `src/app/bootstrap.ts` | 앱 초기화 | `app/providers.tsx` 등 |
| `src/features/dashboard/` | 대시보드 Feature | `app/dashboard/` |
| `src/features/reports/` | 리포트 Feature | `app/reports/` |
| `src/features/goal-weekly/` | 주간 목표 Feature | `app/goal/weekly/` |
| `src/features/goal-monthly/` | 월간 목표 Feature | `app/goal/monthly/` |
| `src/features/settings/` | 설정 Feature | `app/settings/` |
| `src/shared/api/` | API 레이어 | `lib/api/` + `app/api/` (Route Handlers) |
| `src/shared/ui/common/` | 공통 UI 컴포넌트 | `components/ui/` |
| `src/shared/lib/` | 유틸리티 | `lib/utils/` |
| `src/shared/types/` | 공통 타입 | `types/` |

---

## 9. 디렉토리 구조 개편안 (AS-IS → TO-BE)

### 9.1 AS-IS: 현재 프로젝트 구조

```
ads-data-board/
├── src/
│   ├── main.ts                             # 앱 진입점
│   ├── vite-env.d.ts                       # Vite 타입 정의
│   │
│   ├── app/                                # 앱 레벨 설정
│   │   ├── bootstrap.ts                    # 앱 초기화 로직
│   │   ├── init-globals.ts                 # 전역 객체 초기화 (Supabase, Chart.js)
│   │   ├── shared-ui-styles.ts             # 공통 UI 스타일 진입점
│   │   └── styles/                         # 전역 스타일
│   │       ├── main.css                    # 스타일 진입점
│   │       ├── base/                       # 기본 스타일
│   │       │   ├── reset.css
│   │       │   ├── typography.css
│   │       │   ├── buttons.css
│   │       │   ├── layout.css
│   │       │   └── utilities.css
│   │       ├── tokens/                     # 디자인 토큰
│   │       │   ├── colors.css
│   │       │   ├── spacing.css
│   │       │   ├── shadows.css
│   │       │   └── typography.css
│   │       └── utils/
│   │           └── tooltip.css
│   │
│   ├── features/                           # Feature별 비즈니스 로직
│   │   ├── dashboard/                      # 대시보드
│   │   │   ├── index.ts                    # Feature 진입점 (init/destroy)
│   │   │   ├── dashboard-page.css
│   │   │   ├── components/
│   │   │   │   ├── KpiCard/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── KpiCard.ts
│   │   │   │   │   └── KpiCard.css
│   │   │   │   ├── RevenueChart/
│   │   │   │   ├── MonthSelector/
│   │   │   │   └── ManagerPerformance/
│   │   │   └── lib/
│   │   │       ├── load.ts                 # 데이터 로드 로직
│   │   │       ├── kpi.ts                  # KPI 계산
│   │   │       └── types.ts
│   │   │
│   │   ├── reports/                        # 리포트 (일별/주별)
│   │   │   ├── index.ts
│   │   │   ├── reports-page.css
│   │   │   ├── components/
│   │   │   │   ├── ReportFilters/
│   │   │   │   ├── ReportTable/
│   │   │   │   └── StatusCards/
│   │   │   └── lib/
│   │   │       ├── daily/                  # 일별 리포트 로직
│   │   │       ├── weekly/                 # 주별 리포트 로직
│   │   │       └── types.ts
│   │   │
│   │   ├── goal-weekly/                    # 주간 목표
│   │   │   ├── index.ts
│   │   │   ├── weekly-goal.css
│   │   │   ├── components/
│   │   │   │   ├── GoalCard/
│   │   │   │   ├── GoalRegisterModal/      # 모달 컴포넌트
│   │   │   │   ├── WeekNavigation/
│   │   │   │   └── ManagerTabs/
│   │   │   └── lib/
│   │   │       ├── state.ts                # Feature 상태
│   │   │       ├── action-globals.ts
│   │   │       └── types.ts
│   │   │
│   │   ├── goal-monthly/                   # 월간 목표
│   │   │   ├── index.ts
│   │   │   ├── init.ts
│   │   │   ├── goal-monthly.css
│   │   │   ├── components/
│   │   │   │   ├── Calendar/
│   │   │   │   ├── RevenueTrend/
│   │   │   │   ├── MaChart/                # MA 차트
│   │   │   │   ├── OutboundSection/
│   │   │   │   ├── MonthSelector/
│   │   │   │   ├── ManagerTabs/
│   │   │   │   └── MiniCards/
│   │   │   └── lib/
│   │   │       ├── state.ts
│   │   │       ├── charts.ts
│   │   │       └── types.ts
│   │   │
│   │   ├── settings/                       # 설정
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── GoalSettingTable/       # 목표 설정 테이블
│   │   │   │   └── ManagerSettingTable/    # 담당자 설정 테이블
│   │   │   └── lib/
│   │   │       └── events.ts
│   │   │
│   │   └── navigation/                     # 라우팅
│   │       ├── index.ts
│   │       └── lib/
│   │           ├── router.ts               # 라우터 핵심 로직
│   │           ├── route-config.ts         # 라우트 정의
│   │           └── types.ts
│   │
│   └── shared/                             # 공통 모듈
│       ├── api/                            # API 레이어
│       │   ├── supabase-client.ts          # Supabase 클라이언트
│       │   ├── api.ts                      # 범용 API
│       │   ├── goal-api.ts                 # 목표 API
│       │   └── report-api.ts               # 리포트 API
│       │
│       ├── lib/                            # 유틸리티 & 헬퍼
│       │   ├── index.ts
│       │   ├── cache.ts                    # 캐시 시스템
│       │   ├── event-bus.ts                # 이벤트 버스
│       │   ├── request-manager.ts          # 요청 관리
│       │   ├── chart-utils.ts              # 차트 유틸
│       │   ├── backfill-manager.ts
│       │   ├── getLatestDateFromDb.ts
│       │   ├── getLatestMonthFromDb.ts
│       │   └── utils/
│       │       ├── index.ts
│       │       ├── date.ts                 # 날짜 유틸
│       │       └── constants.ts
│       │
│       ├── ui/                             # 공통 UI 컴포넌트
│       │   ├── common/
│       │   │   ├── AppShell/               # 앱 레이아웃
│       │   │   ├── Sidebar/                # 사이드바
│       │   │   ├── Toast/                  # 토스트 알림
│       │   │   ├── Dropdown/               # 드롭다운
│       │   │   ├── DatePicker/             # 날짜 선택
│       │   │   ├── Tabs/                   # 탭
│       │   │   ├── Table/                  # 테이블
│       │   │   └── ...
│       │   └── modals/
│       │       └── DataUpdateModal/        # 데이터 업데이트 모달
│       │
│       └── types/                          # 공통 타입
│           ├── index.ts
│           └── database.types.ts           # Supabase 자동 생성 타입
│
├── .cursor/                                # Cursor 설정
│   └── rules/                              # 프로젝트 규칙
│       ├── 00-project-main.mdc
│       ├── 20-code-main.mdc
│       ├── 31-term-main.mdc
│       └── 40-data-main-rule.mdc
│
├── docs/                                   # 문서
│   └── MIGRATION_ANALYSIS.md
│
├── index.html                              # HTML 진입점
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env
```

### 9.2 TO-BE: Next.js App Router 구조

```
ads-data-board/
├── src/
│   ├── app/                                # Next.js App Router (라우팅)
│   │   ├── layout.tsx                      # 루트 레이아웃 (AppShell)
│   │   ├── page.tsx                        # 홈 페이지 → 대시보드로 리다이렉트
│   │   ├── loading.tsx                     # 글로벌 로딩
│   │   ├── error.tsx                       # 글로벌 에러 페이지
│   │   ├── not-found.tsx                   # 404 페이지
│   │   │
│   │   ├── providers.tsx                   # React Context Providers
│   │   ├── globals.css                     # 전역 스타일 진입점
│   │   │
│   │   ├── dashboard/                      # 대시보드 페이지
│   │   │   ├── page.tsx                    # /dashboard
│   │   │   ├── loading.tsx
│   │   │   └── _components/                # 페이지 전용 컴포넌트
│   │   │       ├── KpiSection.tsx
│   │   │       ├── RevenueChartSection.tsx
│   │   │       └── ManagerPerformanceSection.tsx
│   │   │
│   │   ├── reports/                        # 리포트 페이지
│   │   │   ├── layout.tsx                  # 리포트 레이아웃 (필터 등)
│   │   │   ├── daily/                      # 일별 리포트
│   │   │   │   └── page.tsx                # /reports/daily
│   │   │   └── weekly/                     # 주별 리포트
│   │   │       └── page.tsx                # /reports/weekly
│   │   │
│   │   ├── goal/                           # 목표 페이지
│   │   │   ├── layout.tsx                  # 목표 레이아웃
│   │   │   ├── weekly/                     # 주간 목표
│   │   │   │   ├── page.tsx                # /goal/weekly
│   │   │   │   ├── loading.tsx
│   │   │   │   └── _components/
│   │   │   │       ├── WeekNavigation.tsx
│   │   │   │       ├── GoalCardList.tsx
│   │   │   │       └── GoalRegisterModal.tsx
│   │   │   └── monthly/                    # 월간 목표
│   │   │       ├── page.tsx                # /goal/monthly
│   │   │       ├── loading.tsx
│   │   │       └── _components/
│   │   │           ├── CalendarView.tsx
│   │   │           ├── RevenueTrendChart.tsx
│   │   │           ├── MaChartSection.tsx
│   │   │           └── OutboundSection.tsx
│   │   │
│   │   ├── settings/                       # 설정 페이지
│   │   │   ├── layout.tsx                  # 설정 레이아웃 (탭)
│   │   │   ├── goal-setting/               # 목표 설정
│   │   │   │   └── page.tsx                # /settings/goal-setting
│   │   │   └── manager-setting/            # 담당자 설정
│   │   │       └── page.tsx                # /settings/manager-setting
│   │   │
│   │   └── api/                            # API Routes (Server Actions 대신 사용 가능)
│   │       ├── auth/                       # 인증 관련
│   │       ├── goals/                      # 목표 CRUD
│   │       │   └── route.ts
│   │       └── reports/                    # 리포트 데이터
│   │           └── route.ts
│   │
│   ├── components/                         # 공통 React 컴포넌트
│   │   ├── ui/                             # 재사용 가능한 UI 컴포넌트
│   │   │   ├── AppShell/                   # 앱 레이아웃
│   │   │   │   ├── AppShell.tsx
│   │   │   │   └── AppShell.module.css
│   │   │   ├── Sidebar/                    # 사이드바
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── SidebarNav.tsx
│   │   │   │   └── Sidebar.module.css
│   │   │   ├── Toast/                      # 토스트 알림
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── ToastProvider.tsx
│   │   │   │   └── Toast.module.css
│   │   │   ├── Modal/                      # 모달
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Modal.module.css
│   │   │   ├── Dropdown/                   # 드롭다운
│   │   │   ├── DatePicker/                 # 날짜 선택
│   │   │   ├── Tabs/                       # 탭
│   │   │   ├── Table/                      # 테이블
│   │   │   ├── Button/                     # 버튼
│   │   │   ├── Input/                      # 입력
│   │   │   └── Card/                       # 카드
│   │   │
│   │   ├── features/                       # Feature별 도메인 컴포넌트
│   │   │   ├── dashboard/
│   │   │   │   ├── KpiCard.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── MonthSelector.tsx
│   │   │   │   └── ManagerPerformanceTable.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── ReportFilters.tsx
│   │   │   │   ├── ReportTable.tsx
│   │   │   │   └── StatusCards.tsx
│   │   │   │
│   │   │   ├── goal-weekly/
│   │   │   │   ├── GoalCard.tsx
│   │   │   │   ├── WeekNavigation.tsx
│   │   │   │   ├── GoalRegisterModal.tsx
│   │   │   │   └── GoalDetailModal.tsx
│   │   │   │
│   │   │   ├── goal-monthly/
│   │   │   │   ├── Calendar.tsx
│   │   │   │   ├── RevenueTrendChart.tsx
│   │   │   │   ├── MaChart.tsx
│   │   │   │   ├── OutboundChart.tsx
│   │   │   │   └── MiniCards.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── GoalSettingTable.tsx
│   │   │       └── ManagerSettingTable.tsx
│   │   │
│   │   └── layouts/                        # 레이아웃 컴포넌트
│   │       ├── MainLayout.tsx
│   │       ├── DashboardLayout.tsx
│   │       └── SettingsLayout.tsx
│   │
│   ├── lib/                                # 비즈니스 로직 & 유틸리티
│   │   ├── api/                            # API 클라이언트 레이어
│   │   │   ├── client/                     # Client Component용 API
│   │   │   │   ├── supabase-client.ts      # Browser Supabase Client
│   │   │   │   ├── goals.ts                # 목표 API
│   │   │   │   └── reports.ts              # 리포트 API
│   │   │   │
│   │   │   ├── server/                     # Server Component용 API
│   │   │   │   ├── supabase-server.ts      # Server Supabase Client
│   │   │   │   ├── goals.ts
│   │   │   │   └── reports.ts
│   │   │   │
│   │   │   └── shared/                     # 공통 API 로직
│   │   │       ├── types.ts
│   │   │       └── constants.ts
│   │   │
│   │   ├── features/                       # Feature별 비즈니스 로직
│   │   │   ├── dashboard/
│   │   │   │   ├── kpi-calculator.ts       # KPI 계산 로직
│   │   │   │   ├── chart-data-builder.ts   # 차트 데이터 빌더
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── daily-report.ts         # 일별 리포트 로직
│   │   │   │   ├── weekly-report.ts        # 주별 리포트 로직
│   │   │   │   ├── filters.ts              # 필터 로직
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── goal-weekly/
│   │   │   │   ├── goal-validation.ts      # 목표 검증
│   │   │   │   ├── week-calculator.ts      # 주차 계산
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   └── goal-monthly/
│   │   │       ├── calendar-builder.ts     # 캘린더 빌더
│   │   │       ├── ma-calculator.ts        # MA 계산
│   │   │       └── types.ts
│   │   │
│   │   ├── utils/                          # 범용 유틸리티
│   │   │   ├── date.ts                     # 날짜 유틸
│   │   │   ├── format.ts                   # 포맷팅 유틸
│   │   │   ├── validation.ts               # 검증 유틸
│   │   │   └── constants.ts
│   │   │
│   │   ├── stores/                         # 전역 상태 관리 (Zustand)
│   │   │   ├── use-dashboard-store.ts      # 대시보드 상태
│   │   │   ├── use-goal-store.ts           # 목표 상태
│   │   │   ├── use-manager-store.ts        # 담당자 상태
│   │   │   └── use-ui-store.ts             # UI 상태 (모달, 토스트 등)
│   │   │
│   │   └── cache/                          # 캐시 시스템
│   │       ├── query-cache.ts              # React Query 설정
│   │       └── local-cache.ts              # 로컬 캐시 (선택적)
│   │
│   ├── hooks/                              # 커스텀 React Hooks
│   │   ├── use-supabase.ts                 # Supabase 훅
│   │   ├── use-managers.ts                 # 담당자 목록 훅
│   │   ├── use-goals.ts                    # 목표 CRUD 훅
│   │   ├── use-reports.ts                  # 리포트 데이터 훅
│   │   ├── use-toast.ts                    # 토스트 알림 훅
│   │   ├── use-modal.ts                    # 모달 제어 훅
│   │   ├── use-date-picker.ts              # 날짜 선택 훅
│   │   └── use-debounce.ts                 # Debounce 훅
│   │
│   ├── contexts/                           # React Context (선택적, Zustand 대신)
│   │   ├── AuthContext.tsx                 # 인증 컨텍스트
│   │   ├── ThemeContext.tsx                # 테마 컨텍스트
│   │   └── ManagerContext.tsx              # 담당자 컨텍스트
│   │
│   ├── types/                              # 공통 타입 정의
│   │   ├── index.ts
│   │   ├── database.types.ts               # Supabase 자동 생성 타입
│   │   ├── api.types.ts                    # API 관련 타입
│   │   └── ui.types.ts                     # UI 관련 타입
│   │
│   ├── styles/                             # 전역 스타일
│   │   ├── globals.css                     # 전역 스타일
│   │   ├── variables.css                   # CSS 변수
│   │   ├── reset.css                       # CSS Reset
│   │   └── utils.css                       # 유틸리티 클래스
│   │
│   └── config/                             # 설정 파일
│       ├── env.ts                          # 환경 변수 검증
│       └── constants.ts                    # 상수
│
├── public/                                 # 정적 파일
│   ├── favicon.ico
│   └── icons/
│
├── .cursor/                                # Cursor 설정 (유지)
│   └── rules/
│
├── docs/                                   # 문서 (유지)
│   └── MIGRATION_ANALYSIS.md
│
├── .env.local                              # 환경 변수 (로컬)
├── .env.example                            # 환경 변수 예시
├── next.config.js                          # Next.js 설정
├── tsconfig.json                           # TypeScript 설정
├── package.json
└── README.md
```

### 9.3 주요 변경 사항

#### 9.3.1 라우팅
| AS-IS | TO-BE | 설명 |
|-------|-------|------|
| Custom Router (`features/navigation/`) | `app/` 폴더 기반 라우팅 | 파일 시스템 기반 자동 라우팅 |
| `features/dashboard/index.ts` | `app/dashboard/page.tsx` | 페이지 컴포넌트로 전환 |
| `features/reports/` (단일 Feature) | `app/reports/daily/`, `app/reports/weekly/` | 중첩 라우트 활용 |
| Client-Side Navigation | Next.js Link & 자동 Prefetch | SSR/SSG 지원 |

#### 9.3.2 컴포넌트 구조
| AS-IS | TO-BE | 설명 |
|-------|-------|------|
| Class-based Components | React Functional Components | 선언형 컴포넌트 |
| `render(container)` / `destroy()` | React Lifecycle (useEffect) | React 생명주기 |
| `innerHTML` / `insertAdjacentHTML` | JSX | 타입 안전한 템플릿 |
| `querySelector` / `getElementById` | React Refs (`useRef`) | DOM 접근 방식 |
| `addEventListener` | React Event Handlers | 이벤트 처리 |

#### 9.3.3 상태 관리
| AS-IS | TO-BE | 설명 |
|-------|-------|------|
| Module-level State | Zustand Store | 전역 상태 관리 |
| Event Bus (`emit`, `on`) | Props / Context / Zustand | 컴포넌트 간 통신 |
| `window.weeklyGoalState` | `useGoalStore()` | 타입 안전한 상태 접근 |
| DOM Cache (`cache.domElements`) | React 자동 관리 | 불필요 (React가 처리) |

#### 9.3.4 API 레이어
| AS-IS | TO-BE | 설명 |
|-------|-------|------|
| `shared/api/` (단일 클라이언트) | `lib/api/client/`, `lib/api/server/` | Server/Client 분리 |
| `window.supabase` | `createClientComponentClient()` | 컨텍스트 기반 클라이언트 |
| Request Manager | React Query / SWR | 자동 캐싱, 재시도, 리페칭 |
| Manual Cache (`cache.ts`) | React Query Cache | 자동 캐시 관리 |

#### 9.3.5 스타일링
| AS-IS | TO-BE | 설명 |
|-------|-------|------|
| Plain CSS (BEM) | CSS Modules / Plain CSS | 스코프 격리 (선택적) |
| `app/styles/main.css` | `app/globals.css` | 전역 스타일 진입점 |
| Component-Scoped CSS | `.module.css` | 자동 스코프 격리 |
| CSS 변수 (유지) | CSS 변수 (유지) | 동일하게 사용 |

### 9.4 폴더별 역할 정의 (TO-BE)

#### 📁 `src/app/` - Next.js App Router
- **역할**: 페이지 라우팅, 레이아웃, 로딩/에러 상태
- **파일 타입**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **명명 규칙**: 폴더명이 URL 경로가 됨 (`app/dashboard/` → `/dashboard`)

#### 📁 `src/components/` - React 컴포넌트
- **역할**: 재사용 가능한 UI 컴포넌트 및 Feature별 컴포넌트
- **하위 구조**:
  - `ui/`: 범용 UI 컴포넌트 (Button, Modal, Table 등)
  - `features/`: Feature별 도메인 컴포넌트 (KpiCard, ReportTable 등)
  - `layouts/`: 레이아웃 컴포넌트

#### 📁 `src/lib/` - 비즈니스 로직 & 유틸리티
- **역할**: 순수 함수, API 클라이언트, 데이터 변환 로직
- **하위 구조**:
  - `api/`: Supabase API 클라이언트 (server/client 분리)
  - `features/`: Feature별 비즈니스 로직 (계산, 검증 등)
  - `utils/`: 범용 유틸리티 함수
  - `stores/`: 전역 상태 관리 (Zustand)
  - `cache/`: 캐시 설정 (React Query)

#### 📁 `src/hooks/` - 커스텀 React Hooks
- **역할**: 재사용 가능한 React 로직
- **예시**: `useSupabase`, `useGoals`, `useToast`, `useDebounce`

#### 📁 `src/contexts/` - React Context (선택적)
- **역할**: 전역 상태 제공 (Zustand 대신 사용 가능)
- **예시**: `AuthContext`, `ThemeContext`

#### 📁 `src/types/` - TypeScript 타입
- **역할**: 공통 타입 정의, Supabase 자동 생성 타입
- **파일**: `database.types.ts`, `api.types.ts`, `ui.types.ts`

#### 📁 `src/styles/` - 전역 스타일
- **역할**: 전역 CSS, CSS 변수, Reset CSS
- **파일**: `globals.css`, `variables.css`, `reset.css`

### 9.5 명명 규칙 변경

| 항목 | AS-IS | TO-BE | 예시 |
|------|-------|-------|------|
| **페이지** | `initDashboardPage()` | `page.tsx` | `app/dashboard/page.tsx` |
| **컴포넌트 파일** | `KpiCard.ts` | `KpiCard.tsx` | `components/features/dashboard/KpiCard.tsx` |
| **스타일 파일** | `KpiCard.css` | `KpiCard.module.css` | 선택적 (CSS Modules 사용 시) |
| **타입 파일** | `types.ts` | `types.ts` 또는 `.tsx` 내부 | 동일하거나 컴포넌트 파일 내 정의 |
| **API 함수** | `fetchSharedManagers()` | `getManagers()` | `lib/api/server/managers.ts` |
| **상태 관리** | `weeklyGoalState` | `useGoalStore()` | `lib/stores/use-goal-store.ts` |
| **훅** | - | `useGoals()` | `hooks/use-goals.ts` |

### 9.6 마이그레이션 우선순위별 경로 매핑

#### Phase 1: 공통 모듈 (Foundation)
```
AS-IS                                    TO-BE
─────────────────────────────────────────────────────────────
src/shared/types/                    →  src/types/
src/shared/lib/utils/                →  src/lib/utils/
src/shared/lib/cache.ts              →  src/lib/cache/ (React Query로 대체)
src/shared/api/                      →  src/lib/api/
src/app/styles/                      →  src/styles/
```

#### Phase 2: 레이아웃 & 네비게이션
```
AS-IS                                    TO-BE
─────────────────────────────────────────────────────────────
src/shared/ui/common/AppShell/       →  src/app/layout.tsx
src/shared/ui/common/Sidebar/        →  src/components/ui/Sidebar/
src/features/navigation/             →  삭제 (Next.js Router로 대체)
```

##### 2.1 AppShell → Root Layout 변환

**목표**: Vanilla TS의 AppShell 클래스 컴포넌트를 Next.js의 Root Layout으로 전환

**변환 작업**:

1. **Root Layout 생성** (`src/app/layout.tsx`)
   ```typescript
   // AS-IS: src/shared/ui/common/AppShell/AppShell.ts
   export class AppShell {
     render(container: HTMLElement): void {
       // DOM 조작으로 레이아웃 생성
     }
   }
   
   // TO-BE: src/app/layout.tsx
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="ko">
         <body>
           <div className="dashboard-container">
             <Sidebar />
             <main className="main-content">{children}</main>
           </div>
         </body>
       </html>
     );
   }
   ```

2. **메타데이터 설정**
   - AS-IS: `index.html`의 `<head>` 태그 정보
   - TO-BE: `layout.tsx`의 `metadata` export
   ```typescript
   export const metadata: Metadata = {
     title: 'Ads Data Board',
     description: '광고 데이터 대시보드',
   };
   ```

3. **Provider 분리** (`src/app/providers.tsx`)
   - Supabase Client Provider
   - Toast Provider (전역 알림)
   - React Query Provider (데이터 캐싱)
   - Theme Provider (선택적)

4. **CSS 마이그레이션**
   - `src/app/styles/main.css` → `src/app/globals.css`
   - `layout.tsx`에서 import

**주의사항**:
- `destroy()` 메서드 제거 (React가 자동 관리)
- `render()` 로직을 JSX로 변환
- 페이지별 컨테이너 생성 제거 (Next.js가 자동 라우팅)

---

##### 2.2 Sidebar → React Component 변환

**목표**: Vanilla TS Sidebar 클래스를 Next.js Client Component로 전환

**변환 작업**:

1. **Sidebar 컴포넌트 생성** (`src/components/ui/Sidebar/Sidebar.tsx`)
   ```typescript
   // AS-IS: Class-based, DOM 직접 조작
   export class Sidebar {
     render(container: HTMLElement): void {
       container.innerHTML = `<nav>...</nav>`;
       this.attachEventListeners();
     }
   }
   
   // TO-BE: React Client Component
   'use client';
   
   export function Sidebar() {
     const pathname = usePathname();
     
     return (
       <nav className="sidebar">
         <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
           대시보드
         </Link>
         {/* ... */}
       </nav>
     );
   }
   ```

2. **네비게이션 처리**
   - AS-IS: `addEventListener('click')` + 페이지 전환 로직
   - TO-BE: Next.js `<Link>` 컴포넌트 사용
   ```typescript
   import Link from 'next/link';
   import { usePathname } from 'next/navigation';
   ```

3. **활성 상태 관리**
   - AS-IS: `.active` 클래스 수동 토글
   - TO-BE: `usePathname()` 훅으로 현재 경로 확인
   ```typescript
   const pathname = usePathname();
   const isActive = pathname === '/dashboard';
   ```

4. **하위 메뉴 (Sub-navigation)**
   - AS-IS: `data-sub-page` 속성으로 관리
   - TO-BE: 중첩 라우트 사용
   ```typescript
   <Link href="/reports/daily">일별 리포트</Link>
   <Link href="/reports/weekly">주별 리포트</Link>
   ```

5. **아코디언/드롭다운 메뉴**
   - AS-IS: DOM 클래스 토글
   - TO-BE: `useState`로 열림/닫힘 상태 관리
   ```typescript
   const [isExpanded, setIsExpanded] = useState(false);
   ```

**주의사항**:
- Client Component 필수 (`'use client'` 지시어)
- `addEventListener` → `onClick` props
- `querySelector` 제거, React refs 사용 (`useRef`)
- CSS 유지 또는 CSS Modules로 전환

---

##### 2.3 Navigation 로직 제거 및 Next.js Router 적용

**목표**: Custom Router 제거하고 Next.js App Router의 파일 기반 라우팅 활용

**삭제 대상**:

1. **`src/features/navigation/` 폴더 전체 삭제**
   - `lib/router.ts` (라우터 핵심 로직)
   - `lib/route-config.ts` (라우트 정의 및 동적 import)
   - `lib/types.ts` (라우터 타입)
   - `index.ts` (라우터 초기화)

2. **제거할 기능과 Next.js 대체 방법**

| AS-IS (Custom Router) | TO-BE (Next.js App Router) | 설명 |
|----------------------|---------------------------|------|
| `setupNavigation()` | 파일 시스템 라우팅 | `app/dashboard/page.tsx` 생성 → `/dashboard` 자동 라우트 |
| `featureLoaders` (동적 import) | 자동 코드 스플리팅 | Next.js가 페이지별로 자동 분할 |
| `runCurrentDestroy()` | React 생명주기 | `useEffect` cleanup 함수로 대체 |
| `currentFeature` 상태 | 불필요 | React가 컴포넌트 마운트/언마운트 자동 관리 |
| 페이지 활성화 (`.active` 클래스) | 자동 처리 | Next.js가 라우트별로 페이지 렌더링 |
| History API (`pushState`) | 자동 처리 | Next.js Router가 브라우저 히스토리 관리 |

3. **페이지 전환 로직 변환**

   **AS-IS: Custom Router**
   ```typescript
   navItem.addEventListener('click', async function() {
     const pageId = this.getAttribute('data-page');
     
     // 이전 Feature destroy
     await runCurrentDestroy();
     
     // 새 Feature 로드
     const mod = await featureLoaders[pageId]();
     mod.initDashboardPage();
     
     // destroy 함수 저장
     currentFeature = { destroy: mod.destroy };
   });
   ```

   **TO-BE: Next.js Link**
   ```typescript
   // Sidebar.tsx
   <Link href="/dashboard">대시보드</Link>
   
   // app/dashboard/page.tsx
   export default function DashboardPage() {
     useEffect(() => {
       // 초기화 로직
       return () => {
         // cleanup 로직 (destroy 대체)
       };
     }, []);
     
     return <div>대시보드 내용</div>;
   }
   ```

4. **라우트 구조 변환**

   **AS-IS: route-config.ts**
   ```typescript
   export const featureLoaders: Record<string, FeatureLoader> = {
     'dashboard': () => import('../../dashboard'),
     'sales-report': () => import('../../reports'),
     'sales-report/daily': () => import('../../reports'),
     'sales-report/weekly': () => import('../../reports'),
     'goal/monthly': () => import('../../goal-monthly'),
     'goal/weekly': () => import('../../goal-weekly'),
   };
   ```

   **TO-BE: 파일 시스템 라우팅**
   ```
   src/app/
   ├── dashboard/
   │   └── page.tsx              → /dashboard
   ├── reports/
   │   ├── daily/
   │   │   └── page.tsx          → /reports/daily
   │   └── weekly/
   │       └── page.tsx          → /reports/weekly
   └── goal/
       ├── weekly/
       │   └── page.tsx          → /goal/weekly
       └── monthly/
           └── page.tsx          → /goal/monthly
   ```

5. **Feature 생명주기 변환**

   **AS-IS: init/destroy 패턴**
   ```typescript
   // features/dashboard/index.ts
   export function initDashboardPage() {
     // 초기화 로직
     loadData();
     attachListeners();
   }
   
   export function destroy() {
     // cleanup 로직
     removeListeners();
   }
   ```

   **TO-BE: React useEffect**
   ```typescript
   // app/dashboard/page.tsx
   export default function DashboardPage() {
     useEffect(() => {
       // 초기화 로직 (init 대체)
       loadData();
       
       return () => {
         // cleanup 로직 (destroy 대체)
       };
     }, []);
     
     return <div>...</div>;
   }
   ```

**주의사항**:
- 페이지 컨테이너 미리 생성하지 않음 (Next.js가 필요 시 렌더링)
- `init()` 로직을 Server Component 데이터 fetching + Client Component `useEffect`로 분리
- `destroy()` 로직을 `useEffect` cleanup 함수로 이동
- URL 파라미터는 `searchParams`, `params` props로 접근

---

##### 2.4 중첩 라우트 및 레이아웃 활용

**목표**: Next.js의 중첩 레이아웃 기능을 활용하여 공통 UI 재사용

**예시 1: Reports 레이아웃**
```typescript
// src/app/reports/layout.tsx
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="reports-container">
      <ReportFilters /> {/* 공통 필터 */}
      <div className="reports-content">
        {children} {/* daily 또는 weekly 페이지 */}
      </div>
    </div>
  );
}
```

**예시 2: Settings 레이아웃 (탭 구조)**
```typescript
// src/app/settings/layout.tsx
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-container">
      <SettingsTabs /> {/* 목표 설정 / 담당자 설정 탭 */}
      <div className="settings-content">
        {children}
      </div>
    </div>
  );
}
```

**장점**:
- 공통 UI 자동 유지 (페이지 전환 시에도 레이아웃 유지)
- 중복 코드 제거
- 로딩 상태 세밀 제어 (`loading.tsx`)

---

##### 2.5 마이그레이션 체크리스트

- [ ] `src/app/layout.tsx` 생성 (Root Layout)
- [ ] `src/app/providers.tsx` 생성 (전역 Provider)
- [ ] `src/app/globals.css` 생성 및 스타일 이동
- [ ] `src/components/ui/Sidebar/Sidebar.tsx` 생성
- [ ] Sidebar에 Next.js `<Link>` 적용
- [ ] `usePathname()` 훅으로 활성 상태 관리
- [ ] `src/features/navigation/` 폴더 삭제
- [ ] 페이지별 라우트 폴더 생성 (`app/dashboard/`, `app/reports/` 등)
- [ ] 각 Feature의 `init()` 로직을 페이지 컴포넌트로 이동
- [ ] 각 Feature의 `destroy()` 로직을 `useEffect` cleanup으로 변환
- [ ] 중첩 레이아웃 구조 설계 (Reports, Settings 등)
- [ ] `index.html` 삭제 (Next.js 자동 생성)
- [ ] `src/main.ts` 삭제 (Next.js 자동 진입점)
- [ ] `src/app/bootstrap.ts` 로직을 `layout.tsx`와 `providers.tsx`로 분산

---

##### 2.6 예상 이슈 및 해결 방안

| 이슈 | 원인 | 해결 방안 |
|-----|------|---------|
| Hydration 에러 | SSR과 CSR HTML 불일치 | `'use client'` 지시어 추가, `useEffect`에서 초기화 |
| `window is not defined` 에러 | Server Component에서 브라우저 API 접근 | Client Component로 분리하거나 `typeof window !== 'undefined'` 체크 |
| Sidebar 활성 상태 미동작 | `usePathname()` 사용 안 함 | `usePathname()` 훅으로 현재 경로 확인 |
| 페이지 전환 시 상태 유지 안 됨 | Feature 간 상태 공유 로직 제거됨 | Zustand 또는 URL searchParams로 상태 관리 |
| CSS 스타일 깨짐 | CSS import 순서 문제 | `globals.css` 먼저 import, 컴포넌트 CSS는 나중에 |

---

##### 2.7 테스트 계획

**Phase 2 완료 후 확인 사항**:

1. **레이아웃 렌더링**
   - [ ] Root Layout이 정상적으로 표시되는가?
   - [ ] Sidebar가 모든 페이지에서 보이는가?

2. **네비게이션**
   - [ ] Sidebar 링크 클릭 시 페이지 전환되는가?
   - [ ] 활성 페이지가 하이라이트 되는가?
   - [ ] 브라우저 뒤로가기/앞으로가기 동작하는가?

3. **스타일**
   - [ ] 전역 스타일이 적용되는가?
   - [ ] Sidebar 스타일이 유지되는가?
   - [ ] 반응형 레이아웃이 동작하는가?

4. **성능**
   - [ ] 페이지 전환이 빠른가? (코드 스플리팅 확인)
   - [ ] 불필요한 리렌더링이 없는가?

**테스트 도구**:
- Chrome DevTools (Network, Performance)
- Next.js DevTools (빌드 분석)
- Lighthouse (성능 측정)

---

#### Phase 3: Feature별 마이그레이션

Phase 3에서는 각 Feature를 개별적으로 Next.js로 마이그레이션합니다. 우선순위는 다음과 같습니다:

1. **Dashboard** (가장 단순, 의존성 적음)
2. **Reports** (중간 복잡도, 필터링 로직)
3. **Goal Weekly** (상태 관리 복잡, 모달)
4. **Goal Monthly** (차트 많음, 복잡도 높음)
5. **Settings** (CRUD, 테이블 편집)

---

### 3.1 Dashboard 마이그레이션

**목표**: 대시보드 Feature를 Next.js Server/Client Component 구조로 전환

#### 3.1.1 현재 구조 분석

**AS-IS 폴더 구조**:
```
src/features/dashboard/
├── index.ts                          # Feature 진입점 (initDashboardPage)
├── dashboard-page.css                # Feature 스타일
├── components/
│   ├── KpiCard/
│   │   ├── index.ts
│   │   ├── KpiCard.ts                # KPI 카드 컴포넌트
│   │   └── KpiCard.css
│   ├── RevenueChart/
│   │   ├── index.ts
│   │   ├── RevenueChart.ts           # 매출 차트 (Chart.js)
│   │   └── RevenueChart.css
│   ├── MonthSelector/
│   │   ├── index.ts
│   │   ├── MonthSelector.ts          # 월 선택기
│   │   └── MonthSelector.css
│   └── ManagerPerformance/
│       ├── index.ts
│       ├── ManagerPerformance.ts     # 담당자별 실적 테이블
│       └── ManagerPerformance.css
└── lib/
    ├── load.ts                       # 데이터 로드 로직
    ├── kpi.ts                        # KPI 계산 로직
    └── types.ts                      # 타입 정의
```

**TO-BE 폴더 구조**:
```
src/app/dashboard/
├── page.tsx                          # 대시보드 페이지 (Server Component)
├── loading.tsx                       # 로딩 UI
└── error.tsx                         # 에러 UI

src/components/features/dashboard/
├── KpiCard.tsx                       # KPI 카드 (Server Component)
├── KpiCardGrid.tsx                   # KPI 카드 그리드
├── RevenueChart.tsx                  # 매출 차트 (Client Component)
├── MonthSelector.tsx                 # 월 선택기 (Client Component)
└── ManagerPerformanceTable.tsx       # 담당자 실적 테이블 (Server Component)

src/lib/features/dashboard/
├── kpi-calculator.ts                 # KPI 계산 로직 (순수 함수)
├── data-fetcher.ts                   # 데이터 fetch 함수
└── types.ts                          # 타입 정의
```

---

#### 3.1.2 Step 1: Page Component 생성

**1-1. 대시보드 페이지 생성** (`src/app/dashboard/page.tsx`)

```typescript
// AS-IS: src/features/dashboard/index.ts
export async function initDashboardPage() {
  const container = document.getElementById('dashboard-page');
  if (!container) return;

  // 데이터 로드
  const data = await loadDashboardData();
  
  // 컴포넌트 렌더링
  const kpiCards = new KpiCardGrid(data.kpis);
  kpiCards.render(container);
  
  const chart = new RevenueChart(data.chartData);
  chart.render(container);
  
  // ... 이벤트 리스너 등록
}

export function destroy() {
  // cleanup
}

// TO-BE: src/app/dashboard/page.tsx
import { Suspense } from 'react';
import { KpiCardGrid } from '@/components/features/dashboard/KpiCardGrid';
import { RevenueChartSection } from '@/components/features/dashboard/RevenueChartSection';
import { ManagerPerformanceSection } from '@/components/features/dashboard/ManagerPerformanceSection';
import { fetchDashboardData } from '@/lib/features/dashboard/data-fetcher';

export const metadata = {
  title: '대시보드 | Ads Data Board',
  description: '광고 데이터 대시보드',
};

export default async function DashboardPage() {
  // Server Component에서 직접 데이터 fetch
  const data = await fetchDashboardData();
  
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>대시보드</h1>
        <MonthSelector />
      </header>
      
      {/* KPI 카드 (Server Component) */}
      <KpiCardGrid kpis={data.kpis} />
      
      {/* 차트 섹션 (Client Component) */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChartSection chartData={data.chartData} />
      </Suspense>
      
      {/* 담당자별 실적 (Server Component) */}
      <ManagerPerformanceSection managers={data.managers} />
    </div>
  );
}
```

**핵심 변경사항**:
- ✅ `initDashboardPage()` → React Server Component
- ✅ 데이터 fetching을 Server Component에서 직접 수행
- ✅ `destroy()` 제거 (React가 자동 관리)
- ✅ Suspense로 로딩 상태 처리
- ✅ 메타데이터 export로 SEO 최적화

**1-2. 로딩 UI** (`src/app/dashboard/loading.tsx`)

```typescript
export default function DashboardLoading() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>대시보드</h1>
        <div className="skeleton skeleton-month-selector" />
      </div>
      
      {/* KPI 스켈레톤 */}
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-kpi-card" />
        ))}
      </div>
      
      {/* 차트 스켈레톤 */}
      <div className="skeleton skeleton-chart" />
      
      {/* 테이블 스켈레톤 */}
      <div className="skeleton skeleton-table" />
    </div>
  );
}
```

**1-3. 에러 UI** (`src/app/dashboard/error.tsx`)

```typescript
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>대시보드 로드 중 오류가 발생했습니다</h2>
      <p>{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
```

---

#### 3.1.3 Step 2: 데이터 Fetching 로직 분리

**2-1. 데이터 Fetcher 생성** (`src/lib/features/dashboard/data-fetcher.ts`)

```typescript
// AS-IS: src/features/dashboard/lib/load.ts
import { getSupabaseClient } from '@shared/api/supabase-client';

export async function loadDashboardData() {
  const supabase = getSupabaseClient(); // window.supabase 사용
  
  // 여러 쿼리를 순차 실행
  const kpisData = await fetchKpis(supabase);
  const chartData = await fetchChartData(supabase);
  const managersData = await fetchManagers(supabase);
  
  return { kpisData, chartData, managersData };
}

// TO-BE: src/lib/features/dashboard/data-fetcher.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export async function fetchDashboardData() {
  const supabase = createServerComponentClient<Database>({ cookies });
  
  // 병렬로 데이터 fetch (성능 개선)
  const [kpis, chartData, managers] = await Promise.all([
    fetchKpis(supabase),
    fetchChartData(supabase),
    fetchManagers(supabase),
  ]);
  
  return { kpis, chartData, managers };
}

async function fetchKpis(supabase: SupabaseClient<Database>) {
  // 최신 날짜 조회
  const { data: latestDate } = await supabase
    .from('ads_data_daily')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  
  if (!latestDate) throw new Error('데이터가 없습니다');
  
  // KPI 데이터 조회
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('*')
    .eq('date', latestDate.date);
  
  if (error) throw error;
  
  // KPI 계산
  return calculateKpis(data);
}

async function fetchChartData(supabase: SupabaseClient<Database>) {
  // 차트용 데이터 조회 (최근 30일)
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('date, amount, goal_amount')
    .gte('date', /* 30일 전 날짜 */)
    .order('date', { ascending: true });
  
  if (error) throw error;
  return data;
}

async function fetchManagers(supabase: SupabaseClient<Database>) {
  // 담당자별 실적 조회
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select(`
      manager_id,
      shared_manager(name),
      amount,
      goal_amount
    `)
    .eq('date', /* 최신 날짜 */);
  
  if (error) throw error;
  return data;
}
```

**핵심 변경사항**:
- ✅ `window.supabase` → `createServerComponentClient()`
- ✅ 순차 실행 → 병렬 실행 (`Promise.all`)
- ✅ 타입 안전성 강화 (Database 제네릭)
- ✅ Server Component 전용 (cookies 사용)

---

#### 3.1.4 Step 3: KPI 카드 컴포넌트 변환

**3-1. KpiCard 컴포넌트** (`src/components/features/dashboard/KpiCard.tsx`)

```typescript
// AS-IS: src/features/dashboard/components/KpiCard/KpiCard.ts
export class KpiCard {
  constructor(private data: KpiData) {}
  
  render(container: HTMLElement): void {
    const html = `
      <div class="KpiCard">
        <div class="KpiCard__title">${this.data.title}</div>
        <div class="KpiCard__value">${formatNumberWithCommas(this.data.value)}</div>
        <div class="KpiCard__change ${this.data.change >= 0 ? 'positive' : 'negative'}">
          ${this.data.change >= 0 ? '+' : ''}${this.data.change}%
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  }
  
  destroy(): void {
    // cleanup
  }
}

// TO-BE: src/components/features/dashboard/KpiCard.tsx
import { formatNumberWithCommas } from '@/lib/utils/format';
import type { KpiData } from '@/lib/features/dashboard/types';

interface KpiCardProps {
  data: KpiData;
}

export function KpiCard({ data }: KpiCardProps) {
  const isPositive = data.change >= 0;
  
  return (
    <div className="KpiCard">
      <div className="KpiCard__title">{data.title}</div>
      <div className="KpiCard__value">
        {formatNumberWithCommas(data.value)}
      </div>
      <div className={`KpiCard__change ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{data.change}%
      </div>
    </div>
  );
}
```

**핵심 변경사항**:
- ✅ Class → Function Component
- ✅ `render()` → JSX return
- ✅ `innerHTML` → React JSX
- ✅ Props 인터페이스 정의
- ✅ `destroy()` 제거

**3-2. KpiCardGrid 컴포넌트** (`src/components/features/dashboard/KpiCardGrid.tsx`)

```typescript
import { KpiCard } from './KpiCard';
import type { KpiData } from '@/lib/features/dashboard/types';

interface KpiCardGridProps {
  kpis: KpiData[];
}

export function KpiCardGrid({ kpis }: KpiCardGridProps) {
  return (
    <div className="kpi-grid">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} data={kpi} />
      ))}
    </div>
  );
}
```

---

#### 3.1.5 Step 4: Chart 컴포넌트 변환 (Client Component)

**4-1. RevenueChart 컴포넌트** (`src/components/features/dashboard/RevenueChart.tsx`)

```typescript
// AS-IS: src/features/dashboard/components/RevenueChart/RevenueChart.ts
import { Chart } from 'chart.js';

export class RevenueChart {
  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  constructor(private data: ChartData) {}
  
  render(container: HTMLElement): void {
    const html = `
      <div class="RevenueChart">
        <canvas id="revenue-chart"></canvas>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    
    this.canvas = document.getElementById('revenue-chart') as HTMLCanvasElement;
    this.initChart();
  }
  
  private initChart(): void {
    if (!this.canvas) return;
    
    this.chart = new Chart(this.canvas, {
      type: 'line',
      data: this.data,
      options: { /* ... */ },
    });
  }
  
  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

// TO-BE: src/components/features/dashboard/RevenueChart.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import type { ChartData } from '@/lib/features/dashboard/types';

interface RevenueChartProps {
  data: ChartData;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Chart 초기화
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: '실제 매출',
            data: data.revenue,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: '목표 매출',
            data: data.goal,
            borderColor: 'rgb(239, 68, 68)',
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
      },
    };
    
    chartRef.current = new Chart(canvasRef.current, config);
    
    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);
  
  return (
    <div className="RevenueChart">
      <h3>매출 추이</h3>
      <div className="chart-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
```

**핵심 변경사항**:
- ✅ **Client Component 필수** (`'use client'` 지시어)
- ✅ `useRef`로 canvas 참조
- ✅ `useEffect`에서 Chart 초기화
- ✅ `useEffect` cleanup 함수에서 Chart destroy
- ✅ `data` prop 변경 시 자동 재렌더링

**4-2. Chart Wrapper (재사용 가능)** (`src/components/features/dashboard/RevenueChartSection.tsx`)

```typescript
'use client';

import { RevenueChart } from './RevenueChart';
import type { ChartData } from '@/lib/features/dashboard/types';

interface RevenueChartSectionProps {
  chartData: ChartData;
}

export function RevenueChartSection({ chartData }: RevenueChartSectionProps) {
  return (
    <section className="chart-section">
      <RevenueChart data={chartData} />
    </section>
  );
}
```

---

#### 3.1.6 Step 5: MonthSelector 변환 (Client Component)

**5-1. MonthSelector 컴포넌트** (`src/components/features/dashboard/MonthSelector.tsx`)

```typescript
// AS-IS: src/features/dashboard/components/MonthSelector/MonthSelector.ts
export class MonthSelector {
  private currentMonth: string;
  
  constructor() {
    this.currentMonth = getCurrentMonth();
  }
  
  render(container: HTMLElement): void {
    const html = `
      <div class="MonthSelector">
        <button class="prev-month">◀</button>
        <span class="current-month">${this.formatMonth(this.currentMonth)}</span>
        <button class="next-month">▶</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    document.querySelector('.prev-month')?.addEventListener('click', () => {
      this.currentMonth = this.getPrevMonth();
      this.update();
    });
    // ...
  }
  
  destroy(): void {
    // removeEventListener
  }
}

// TO-BE: src/components/features/dashboard/MonthSelector.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMonth, getPrevMonth, getNextMonth } from '@/lib/utils/date';

export function MonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = searchParams.get('month') || getCurrentMonth();
  
  const handlePrevMonth = () => {
    const prevMonth = getPrevMonth(currentMonth);
    router.push(`/dashboard?month=${prevMonth}`);
  };
  
  const handleNextMonth = () => {
    const nextMonth = getNextMonth(currentMonth);
    router.push(`/dashboard?month=${nextMonth}`);
  };
  
  return (
    <div className="MonthSelector">
      <button 
        className="prev-month" 
        onClick={handlePrevMonth}
        aria-label="이전 월"
      >
        ◀
      </button>
      <span className="current-month">{formatMonth(currentMonth)}</span>
      <button 
        className="next-month" 
        onClick={handleNextMonth}
        aria-label="다음 월"
      >
        ▶
      </button>
    </div>
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

**핵심 변경사항**:
- ✅ **Client Component** (상태 관리 필요)
- ✅ `addEventListener` → `onClick` props
- ✅ URL searchParams로 월 상태 관리 (새로고침 시에도 유지)
- ✅ `useRouter`로 페이지 이동 (shallow routing)
- ✅ 접근성 개선 (`aria-label`)

---

#### 3.1.7 Step 6: ManagerPerformance 테이블 변환

**6-1. ManagerPerformanceTable 컴포넌트** (`src/components/features/dashboard/ManagerPerformanceTable.tsx`)

```typescript
// TO-BE: Server Component (데이터를 props로 받음)
import { formatNumberWithCommas } from '@/lib/utils/format';
import type { ManagerPerformance } from '@/lib/features/dashboard/types';

interface ManagerPerformanceTableProps {
  managers: ManagerPerformance[];
}

export function ManagerPerformanceTable({ managers }: ManagerPerformanceTableProps) {
  return (
    <section className="manager-performance">
      <h3>담당자별 실적</h3>
      <table className="performance-table">
        <thead>
          <tr>
            <th>담당자</th>
            <th>실적</th>
            <th>목표</th>
            <th>달성률</th>
          </tr>
        </thead>
        <tbody>
          {managers.map((manager) => (
            <tr key={manager.id}>
              <td>{manager.name}</td>
              <td>{formatNumberWithCommas(manager.amount)}</td>
              <td>{formatNumberWithCommas(manager.goalAmount)}</td>
              <td className={manager.achievementRate >= 100 ? 'achieved' : 'not-achieved'}>
                {manager.achievementRate.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

**핵심 변경사항**:
- ✅ Server Component (정적 테이블)
- ✅ Props로 데이터 전달
- ✅ `.map()`으로 행 렌더링
- ✅ `key` prop 추가 (React 요구사항)

---

#### 3.1.8 Step 7: KPI 계산 로직 분리

**7-1. KPI Calculator** (`src/lib/features/dashboard/kpi-calculator.ts`)

```typescript
// AS-IS: src/features/dashboard/lib/kpi.ts (그대로 이동)
export function calculateKpis(data: DailyData[]): KpiData[] {
  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);
  const totalGoal = data.reduce((sum, item) => sum + item.goal_amount, 0);
  const achievementRate = (totalRevenue / totalGoal) * 100;
  
  // 전일 대비 증감률 계산
  const todayRevenue = data[data.length - 1]?.amount || 0;
  const yesterdayRevenue = data[data.length - 2]?.amount || 0;
  const changeRate = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
  
  return [
    {
      id: 'daily-revenue',
      title: '금일 매출',
      value: todayRevenue,
      change: changeRate,
    },
    {
      id: 'total-revenue',
      title: '총 매출',
      value: totalRevenue,
      change: 0,
    },
    {
      id: 'achievement-rate',
      title: '목표 달성률',
      value: achievementRate,
      change: 0,
    },
    // ...
  ];
}
```

**핵심 변경사항**:
- ✅ 순수 함수 유지 (Server/Client 모두 사용 가능)
- ✅ 타입 정의 강화
- ✅ 단위 테스트 가능

---

#### 3.1.9 마이그레이션 체크리스트 (Dashboard)

- [ ] `src/app/dashboard/page.tsx` 생성
- [ ] `src/app/dashboard/loading.tsx` 생성
- [ ] `src/app/dashboard/error.tsx` 생성
- [ ] `src/lib/features/dashboard/data-fetcher.ts` 생성
- [ ] `src/lib/features/dashboard/kpi-calculator.ts` 이동
- [ ] `src/components/features/dashboard/KpiCard.tsx` 변환
- [ ] `src/components/features/dashboard/KpiCardGrid.tsx` 생성
- [ ] `src/components/features/dashboard/RevenueChart.tsx` 변환 (Client Component)
- [ ] `src/components/features/dashboard/MonthSelector.tsx` 변환 (Client Component)
- [ ] `src/components/features/dashboard/ManagerPerformanceTable.tsx` 변환
- [ ] `src/features/dashboard/` 폴더 삭제
- [ ] CSS 마이그레이션 (CSS Modules 또는 유지)
- [ ] 타입 정의 업데이트
- [ ] Supabase Client → Server Client 전환 확인

---

#### 3.1.10 예상 이슈 및 해결 방안 (Dashboard)

| 이슈 | 원인 | 해결 방안 |
|-----|------|---------|
| Chart.js가 SSR에서 에러 | `window` 객체 접근 | Client Component로 분리, `'use client'` 지시어 추가 |
| 월 선택 시 전체 페이지 리렌더링 | 상태 관리 방식 | URL searchParams 사용, Server Component는 캐시됨 |
| 데이터 로딩이 느림 | 순차 쿼리 실행 | `Promise.all`로 병렬 실행 |
| KPI 카드 깜빡임 | Client Side Rendering | Server Component로 전환, SSR 활용 |
| Chart resize 미동작 | 리사이즈 이벤트 처리 안 함 | Chart.js `responsive: true` 옵션 |

---

#### 3.1.11 테스트 계획 (Dashboard)

**기능 테스트**:
- [ ] 대시보드 페이지 접속 시 KPI 카드 4개 표시
- [ ] 차트가 정상적으로 렌더링됨
- [ ] 월 선택기로 이전/다음 월 이동 가능
- [ ] 담당자별 실적 테이블 표시
- [ ] 로딩 상태 표시 (Skeleton UI)
- [ ] 에러 발생 시 에러 페이지 표시

**성능 테스트**:
- [ ] 초기 로딩 속도 (3초 이내)
- [ ] 월 전환 속도 (1초 이내)
- [ ] Lighthouse 점수 (Performance 90 이상)

**크로스 브라우저 테스트**:
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge

---

### 3.2 Reports 마이그레이션

**목표**: 리포트 Feature를 Daily/Weekly 별도 페이지로 분리하고, 공통 필터 로직을 레이아웃에서 관리

*(상세 가이드는 Dashboard와 유사한 구조로 작성 예정)*

---

### 3.3 Goal Weekly 마이그레이션

**목표**: 주간 목표 Feature를 Next.js로 전환, 모달 상태 관리를 Zustand로 변경, 주차별 목표 CRUD 구현

#### 3.3.1 현재 구조 분석

**AS-IS 폴더 구조**:
```
src/features/goal-weekly/
├── index.ts                                    # Feature 진입점
├── weekly-goal.css                             # Feature 스타일
├── components/
│   ├── GoalCard/
│   │   ├── index.ts
│   │   ├── GoalCard.ts                         # 목표 카드
│   │   └── GoalCard.css
│   ├── GoalRegisterModal/
│   │   ├── index.ts
│   │   ├── GoalRegisterModal.ts                # 목표 등록 모달
│   │   ├── GoalRegisterModal.css
│   │   ├── validation/
│   │   │   └── form-validator.ts               # 폼 검증
│   │   └── services/
│   │       └── goal-service.ts                 # API 호출
│   ├── WeekNavigation/
│   │   ├── index.ts
│   │   ├── WeekNavigation.ts                   # 주차 네비게이션
│   │   └── WeekNavigation.css
│   └── ManagerTabs/
│       ├── index.ts
│       ├── ManagerTabs.ts                      # 담당자 탭
│       └── ManagerTabs.css
└── lib/
    ├── state.ts                                # 전역 상태 (weeklyGoalState)
    ├── action-globals.ts                       # 액션 함수
    ├── week-data-loader.ts                     # 주차별 데이터 로더
    └── types.ts                                # 타입 정의
```

**TO-BE 폴더 구조**:
```
src/app/goal/weekly/
├── page.tsx                                    # 주간 목표 페이지 (Server Component)
├── loading.tsx                                 # 로딩 UI
└── error.tsx                                   # 에러 UI

src/components/features/goal-weekly/
├── GoalCard.tsx                                # 목표 카드 (Client Component)
├── GoalCardList.tsx                            # 목표 카드 리스트
├── GoalRegisterModal.tsx                       # 목표 등록 모달 (Client Component)
├── GoalDetailModal.tsx                         # 목표 상세 모달
├── WeekNavigation.tsx                          # 주차 네비게이션 (Client Component)
└── ManagerTabs.tsx                             # 담당자 탭 (Client Component)

src/lib/features/goal-weekly/
├── validation.ts                               # 폼 검증 (Zod 스키마)
├── week-calculator.ts                          # 주차 계산 로직
└── types.ts                                    # 타입 정의

src/lib/stores/
└── use-goal-store.ts                           # Zustand 스토어 (전역 상태)

src/lib/api/client/
└── goals.ts                                    # 목표 API (Client Component용)

src/lib/api/server/
└── goals.ts                                    # 목표 API (Server Component용)
```

---

#### 3.3.2 Step 1: Page Component 생성

**1-1. 주간 목표 페이지** (`src/app/goal/weekly/page.tsx`)

```typescript
// AS-IS: src/features/goal-weekly/index.ts
export async function initWeeklyGoalPage() {
  const container = document.getElementById('goal-page');
  // 상태 초기화
  weeklyGoalState.currentManagerTabId = null;
  
  // 컴포넌트 렌더링
  const managerTabs = new ManagerTabs();
  managerTabs.render(container);
  
  const weekNav = new WeekNavigation();
  weekNav.render(container);
  
  // 데이터 로드
  await loadWeeklyGoals();
}

// TO-BE: src/app/goal/weekly/page.tsx
import { Suspense } from 'react';
import { fetchWeeklyGoals, fetchManagers } from '@/lib/api/server/goals';
import { ManagerTabs } from '@/components/features/goal-weekly/ManagerTabs';
import { WeekNavigation } from '@/components/features/goal-weekly/WeekNavigation';
import { GoalCardList } from '@/components/features/goal-weekly/GoalCardList';
import { GoalRegisterButton } from '@/components/features/goal-weekly/GoalRegisterButton';

export const metadata = {
  title: '주간 목표 | Ads Data Board',
  description: '주간 목표 관리',
};

interface PageProps {
  searchParams: {
    year?: string;
    week?: string;
    manager?: string;
  };
}

export default async function WeeklyGoalPage({ searchParams }: PageProps) {
  // URL에서 주차 및 담당자 정보 추출
  const currentYear = searchParams.year || new Date().getFullYear().toString();
  const currentWeek = searchParams.week || getCurrentWeek().toString();
  const selectedManager = searchParams.manager || 'all';
  
  // 병렬로 데이터 fetch
  const [goals, managers, weekInfo] = await Promise.all([
    fetchWeeklyGoals(parseInt(currentYear), parseInt(currentWeek), selectedManager),
    fetchManagers(),
    fetchWeekInfo(parseInt(currentYear), parseInt(currentWeek)),
  ]);
  
  return (
    <div className="weekly-goal-page">
      <header className="page-header">
        <h1>주간 목표</h1>
        <GoalRegisterButton />
      </header>
      
      {/* 담당자 탭 (Client Component) */}
      <ManagerTabs 
        managers={managers} 
        selectedManager={selectedManager}
      />
      
      {/* 주차 네비게이션 (Client Component) */}
      <WeekNavigation 
        currentYear={parseInt(currentYear)}
        currentWeek={parseInt(currentWeek)}
        weekInfo={weekInfo}
      />
      
      {/* 목표 카드 리스트 */}
      <Suspense fallback={<GoalCardSkeleton />}>
        <GoalCardList goals={goals} />
      </Suspense>
    </div>
  );
}

function getCurrentWeek(): number {
  // 현재 주차 계산 로직
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}
```

**핵심 변경사항**:
- ✅ URL searchParams로 주차 및 담당자 상태 관리
- ✅ Server Component에서 데이터 fetch
- ✅ `weeklyGoalState` 제거 (URL 기반 상태 관리)
- ✅ 병렬 데이터 로딩

---

#### 3.3.3 Step 2: Zustand Store 생성 (모달 상태 관리)

**2-1. Goal Store** (`src/lib/stores/use-goal-store.ts`)

```typescript
// AS-IS: src/features/goal-weekly/lib/state.ts
export const weeklyGoalState: WeeklyGoalMainState = {
  currentManagerTabId: null,
  datePickerState: { /* ... */ },
  weekNavigationState: { /* ... */ },
  allWeeksData: null,
  currentContentArea: null,
  currentShowSummary: false
};

// window 객체에 노출
declare global {
  interface Window {
    weeklyGoalState?: WeeklyGoalMainState;
  }
}
window.weeklyGoalState = weeklyGoalState;

// TO-BE: src/lib/stores/use-goal-store.ts
import { create } from 'zustand';
import type { Goal } from '@/lib/features/goal-weekly/types';

interface GoalModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  selectedGoal: Goal | null;
}

interface GoalStore {
  // 모달 상태
  modal: GoalModalState;
  openModal: (mode: 'create' | 'edit' | 'view', goal?: Goal) => void;
  closeModal: () => void;
  
  // 목표 캐시 (선택적)
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: number, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: number) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  // 초기 상태
  modal: {
    isOpen: false,
    mode: 'create',
    selectedGoal: null,
  },
  
  // 모달 액션
  openModal: (mode, goal) =>
    set({
      modal: {
        isOpen: true,
        mode,
        selectedGoal: goal || null,
      },
    }),
  
  closeModal: () =>
    set({
      modal: {
        isOpen: false,
        mode: 'create',
        selectedGoal: null,
      },
    }),
  
  // 목표 상태
  goals: [],
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (goalId, updates) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g)),
    })),
  deleteGoal: (goalId) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== goalId),
    })),
}));
```

**핵심 변경사항**:
- ✅ Module State → Zustand Store
- ✅ `window.weeklyGoalState` 제거
- ✅ 타입 안전한 상태 관리
- ✅ 낙관적 업데이트 지원

---

#### 3.3.4 Step 3: WeekNavigation 컴포넌트 변환

**3-1. WeekNavigation** (`src/components/features/goal-weekly/WeekNavigation.tsx`)

```typescript
// AS-IS: src/features/goal-weekly/components/WeekNavigation/WeekNavigation.ts
export class WeekNavigation {
  private currentYear: number;
  private currentWeek: number;
  
  render(container: HTMLElement): void {
    const html = `
      <div class="WeekNavigation">
        <button class="prev-week">이전 주</button>
        <span class="current-week">${this.formatWeek()}</span>
        <button class="next-week">다음 주</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    document.querySelector('.prev-week')?.addEventListener('click', () => {
      this.goToPrevWeek();
    });
  }
}

// TO-BE: src/components/features/goal-weekly/WeekNavigation.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { WeekInfo } from '@/lib/features/goal-weekly/types';

interface WeekNavigationProps {
  currentYear: number;
  currentWeek: number;
  weekInfo: WeekInfo;
}

export function WeekNavigation({ 
  currentYear, 
  currentWeek,
  weekInfo 
}: WeekNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const goToPrevWeek = () => {
    const prevWeek = currentWeek - 1;
    const prevYear = prevWeek < 1 ? currentYear - 1 : currentYear;
    const adjustedWeek = prevWeek < 1 ? 52 : prevWeek;
    
    const params = new URLSearchParams(searchParams);
    params.set('year', prevYear.toString());
    params.set('week', adjustedWeek.toString());
    router.push(`/goal/weekly?${params.toString()}`);
  };
  
  const goToNextWeek = () => {
    const nextWeek = currentWeek + 1;
    const nextYear = nextWeek > 52 ? currentYear + 1 : currentYear;
    const adjustedWeek = nextWeek > 52 ? 1 : nextWeek;
    
    const params = new URLSearchParams(searchParams);
    params.set('year', nextYear.toString());
    params.set('week', adjustedWeek.toString());
    router.push(`/goal/weekly?${params.toString()}`);
  };
  
  const goToToday = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getCurrentWeek();
    
    const params = new URLSearchParams(searchParams);
    params.set('year', currentYear.toString());
    params.set('week', currentWeek.toString());
    router.push(`/goal/weekly?${params.toString()}`);
  };
  
  return (
    <div className="WeekNavigation">
      <button 
        className="prev-week" 
        onClick={goToPrevWeek}
        aria-label="이전 주"
      >
        ◀ 이전 주
      </button>
      
      <div className="current-week">
        <span className="week-label">
          {currentYear}년 {currentWeek}주차
        </span>
        <span className="week-range">
          ({weekInfo.startDate} ~ {weekInfo.endDate})
        </span>
        <button 
          className="today-button" 
          onClick={goToToday}
        >
          오늘
        </button>
      </div>
      
      <button 
        className="next-week" 
        onClick={goToNextWeek}
        aria-label="다음 주"
      >
        다음 주 ▶
      </button>
    </div>
  );
}

function getCurrentWeek(): number {
  // shared_week 테이블에서 조회하는 것이 더 정확
  // 여기서는 간단한 계산
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}
```

**핵심 변경사항**:
- ✅ URL searchParams로 주차 상태 관리
- ✅ `useRouter`로 페이지 이동
- ✅ 주차 정보를 Props로 전달 (`shared_week` 테이블 기준)
- ✅ "오늘" 버튼 추가

---

#### 3.3.5 Step 4: GoalRegisterModal 변환 (복잡한 폼)

**4-1. GoalRegisterModal** (`src/components/features/goal-weekly/GoalRegisterModal.tsx`)

```typescript
// TO-BE: Client Component
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGoalStore } from '@/lib/stores/use-goal-store';
import { goalSchema } from '@/lib/features/goal-weekly/validation';
import { createGoal, updateGoal } from '@/lib/api/client/goals';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/use-toast';
import type { GoalFormData } from '@/lib/features/goal-weekly/types';

export function GoalRegisterModal() {
  const { modal, closeModal } = useGoalStore();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: modal.selectedGoal || {},
  });
  
  // 목표 생성 Mutation
  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      showSuccess('목표가 등록되었습니다');
      queryClient.invalidateQueries(['weekly-goals']);
      closeModal();
      reset();
    },
    onError: (error) => {
      showError('목표 등록에 실패했습니다');
      console.error(error);
    },
  });
  
  // 목표 수정 Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GoalFormData }) =>
      updateGoal(id, data),
    onSuccess: () => {
      showSuccess('목표가 수정되었습니다');
      queryClient.invalidateQueries(['weekly-goals']);
      closeModal();
    },
    onError: (error) => {
      showError('목표 수정에 실패했습니다');
      console.error(error);
    },
  });
  
  const onSubmit = (data: GoalFormData) => {
    if (modal.mode === 'edit' && modal.selectedGoal) {
      updateMutation.mutate({ id: modal.selectedGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const isLoading = createMutation.isPending || updateMutation.isPending;
  
  return (
    <Modal 
      isOpen={modal.isOpen} 
      onClose={closeModal}
      title={modal.mode === 'edit' ? '목표 수정' : '목표 등록'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="goal-form">
        {/* 담당자 선택 */}
        <div className="form-group">
          <label htmlFor="manager_id">담당자</label>
          <select
            id="manager_id"
            {...register('manager_id', { valueAsNumber: true })}
            className={errors.manager_id ? 'error' : ''}
          >
            <option value="">선택하세요</option>
            {/* 담당자 목록 */}
          </select>
          {errors.manager_id && (
            <span className="error-message">{errors.manager_id.message}</span>
          )}
        </div>
        
        {/* 주차 선택 */}
        <div className="form-group">
          <label htmlFor="year">연도</label>
          <input
            type="number"
            id="year"
            {...register('year', { valueAsNumber: true })}
            className={errors.year ? 'error' : ''}
          />
          {errors.year && (
            <span className="error-message">{errors.year.message}</span>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="week_number">주차</label>
          <input
            type="number"
            id="week_number"
            {...register('week_number', { valueAsNumber: true })}
            min="1"
            max="53"
            className={errors.week_number ? 'error' : ''}
          />
          {errors.week_number && (
            <span className="error-message">{errors.week_number.message}</span>
          )}
        </div>
        
        {/* 목표 금액 */}
        <div className="form-group">
          <label htmlFor="goal_amount">목표 금액</label>
          <input
            type="number"
            id="goal_amount"
            {...register('goal_amount', { valueAsNumber: true })}
            placeholder="1000000"
            className={errors.goal_amount ? 'error' : ''}
          />
          {errors.goal_amount && (
            <span className="error-message">{errors.goal_amount.message}</span>
          )}
        </div>
        
        {/* 카테고리 */}
        <div className="form-group">
          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            {...register('category')}
            className={errors.category ? 'error' : ''}
          >
            <option value="total">전체</option>
            <option value="new">신규</option>
            <option value="existing">기존</option>
          </select>
          {errors.category && (
            <span className="error-message">{errors.category.message}</span>
          )}
        </div>
        
        {/* 액션 상태 */}
        <div className="form-group">
          <label htmlFor="action_status">액션 상태</label>
          <select
            id="action_status"
            {...register('action_status')}
            className={errors.action_status ? 'error' : ''}
          >
            <option value="pending">대기</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
          </select>
        </div>
        
        {/* 비고 */}
        <div className="form-group">
          <label htmlFor="notes">비고</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            placeholder="특이사항을 입력하세요"
          />
        </div>
        
        {/* 버튼 */}
        <div className="form-actions">
          <button
            type="button"
            onClick={closeModal}
            className="button secondary"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={isLoading}
          >
            {isLoading ? '저장 중...' : modal.mode === 'edit' ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

**핵심 변경사항**:
- ✅ React Hook Form + Zod 검증
- ✅ React Query Mutation (낙관적 업데이트)
- ✅ Zustand로 모달 상태 관리
- ✅ Toast 알림 (`useToast` 훅)
- ✅ 로딩 상태 표시

**4-2. Zod 검증 스키마** (`src/lib/features/goal-weekly/validation.ts`)

```typescript
// AS-IS: src/features/goal-weekly/components/GoalRegisterModal/validation/form-validator.ts
export function validateGoalForm(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data.manager_id) {
    errors.manager_id = '담당자를 선택하세요';
  }
  
  if (!data.goal_amount || data.goal_amount <= 0) {
    errors.goal_amount = '목표 금액을 입력하세요';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// TO-BE: src/lib/features/goal-weekly/validation.ts
import { z } from 'zod';

export const goalSchema = z.object({
  manager_id: z.number({
    required_error: '담당자를 선택하세요',
    invalid_type_error: '담당자를 선택하세요',
  }),
  
  year: z.number()
    .min(2020, '연도는 2020 이상이어야 합니다')
    .max(2100, '연도는 2100 이하여야 합니다'),
  
  week_number: z.number()
    .min(1, '주차는 1 이상이어야 합니다')
    .max(53, '주차는 53 이하여야 합니다'),
  
  goal_amount: z.number({
    required_error: '목표 금액을 입력하세요',
    invalid_type_error: '목표 금액은 숫자여야 합니다',
  })
    .positive('목표 금액은 0보다 커야 합니다')
    .max(1000000000, '목표 금액이 너무 큽니다'),
  
  category: z.enum(['total', 'new', 'existing'], {
    required_error: '카테고리를 선택하세요',
  }),
  
  action_status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  
  notes: z.string().max(500, '비고는 500자 이하여야 합니다').optional(),
});

export type GoalFormData = z.infer<typeof goalSchema>;
```

**핵심 변경사항**:
- ✅ 명령형 검증 → Zod 선언형 스키마
- ✅ 타입 추론 (`z.infer`)
- ✅ 상세한 에러 메시지
- ✅ React Hook Form과 통합

---

#### 3.3.6 Step 5: ManagerTabs 컴포넌트 변환

**5-1. ManagerTabs** (`src/components/features/goal-weekly/ManagerTabs.tsx`)

```typescript
// TO-BE: Client Component
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Manager } from '@/types';

interface ManagerTabsProps {
  managers: Manager[];
  selectedManager: string;
}

export function ManagerTabs({ managers, selectedManager }: ManagerTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleTabClick = (managerId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('manager', managerId);
    router.push(`/goal/weekly?${params.toString()}`);
  };
  
  return (
    <div className="ManagerTabs">
      <button
        className={`tab ${selectedManager === 'all' ? 'active' : ''}`}
        onClick={() => handleTabClick('all')}
      >
        전체
      </button>
      
      {managers.map((manager) => (
        <button
          key={manager.id}
          className={`tab ${selectedManager === manager.id.toString() ? 'active' : ''}`}
          onClick={() => handleTabClick(manager.id.toString())}
        >
          {manager.name}
        </button>
      ))}
    </div>
  );
}
```

---

#### 3.3.7 Step 6: GoalCard 컴포넌트 변환

**6-1. GoalCard** (`src/components/features/goal-weekly/GoalCard.tsx`)

```typescript
'use client';

import { useGoalStore } from '@/lib/stores/use-goal-store';
import { formatNumberWithCommas } from '@/lib/utils/format';
import type { Goal } from '@/lib/features/goal-weekly/types';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const { openModal } = useGoalStore();
  
  const achievementRate = (goal.actual_amount / goal.goal_amount) * 100;
  const isAchieved = achievementRate >= 100;
  
  return (
    <div 
      className={`GoalCard ${isAchieved ? 'achieved' : 'not-achieved'}`}
      onClick={() => openModal('view', goal)}
    >
      <div className="card-header">
        <h4>{goal.manager_name}</h4>
        <span className={`status-badge ${goal.action_status}`}>
          {getStatusLabel(goal.action_status)}
        </span>
      </div>
      
      <div className="card-body">
        <div className="amount-row">
          <span className="label">실적</span>
          <span className="value">
            {formatNumberWithCommas(goal.actual_amount)}원
          </span>
        </div>
        
        <div className="amount-row">
          <span className="label">목표</span>
          <span className="value">
            {formatNumberWithCommas(goal.goal_amount)}원
          </span>
        </div>
        
        <div className="progress-bar">
          <div 
            className={`progress-fill ${isAchieved ? 'achieved' : ''}`}
            style={{ width: `${Math.min(achievementRate, 100)}%` }}
          />
        </div>
        
        <div className="achievement-rate">
          달성률: <strong>{achievementRate.toFixed(1)}%</strong>
        </div>
      </div>
      
      {goal.notes && (
        <div className="card-footer">
          <p className="notes">{goal.notes}</p>
        </div>
      )}
      
      <button
        className="edit-button"
        onClick={(e) => {
          e.stopPropagation();
          openModal('edit', goal);
        }}
      >
        수정
      </button>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '대기',
    in_progress: '진행중',
    completed: '완료',
  };
  return labels[status] || status;
}
```

---

#### 3.3.8 마이그레이션 체크리스트 (Goal Weekly)

- [ ] `src/app/goal/weekly/page.tsx` 생성
- [ ] `src/lib/stores/use-goal-store.ts` 생성 (Zustand)
- [ ] `src/components/features/goal-weekly/WeekNavigation.tsx` 변환
- [ ] `src/components/features/goal-weekly/ManagerTabs.tsx` 변환
- [ ] `src/components/features/goal-weekly/GoalCard.tsx` 변환
- [ ] `src/components/features/goal-weekly/GoalRegisterModal.tsx` 변환
- [ ] `src/lib/features/goal-weekly/validation.ts` 생성 (Zod)
- [ ] React Hook Form 설정
- [ ] React Query Mutation 설정
- [ ] `src/lib/api/client/goals.ts` 생성
- [ ] `src/features/goal-weekly/` 폴더 삭제
- [ ] `weeklyGoalState` 및 `window` 객체 의존성 제거
- [ ] Event Bus 제거 (Props/Zustand로 대체)

---

#### 3.3.9 예상 이슈 및 해결 방안 (Goal Weekly)

| 이슈 | 원인 | 해결 방안 |
|-----|------|---------|
| 모달이 SSR에서 렌더링 에러 | Portal 사용 문제 | Client Component로 분리, `useEffect`에서 mount 확인 |
| 주차 계산 불일치 | 수동 계산 vs `shared_week` 테이블 | 항상 `shared_week` 테이블 기준으로 사용 |
| 폼 검증 에러 표시 안 됨 | React Hook Form 설정 오류 | `formState.errors` 확인, `register` 올바른 사용 |
| URL 파라미터 손실 | Router push 시 기존 params 제거 | `useSearchParams`로 기존 params 유지 후 업데이트 |
| 낙관적 업데이트 충돌 | React Query 캐시 관리 | `onMutate`에서 이전 데이터 저장, `onError`에서 롤백 |

---

#### 3.3.10 테스트 계획 (Goal Weekly)

**기능 테스트**:
- [ ] 주차 네비게이션으로 이전/다음 주 이동
- [ ] 담당자 탭 전환 시 필터링
- [ ] 목표 등록 모달 열기/닫기
- [ ] 목표 등록 성공 시 목록 자동 갱신
- [ ] 목표 수정 기능
- [ ] 목표 카드 클릭 시 상세 보기
- [ ] 폼 검증 에러 표시
- [ ] URL 공유 시 상태 유지

**성능 테스트**:
- [ ] 목표 카드 100개 이상 렌더링 성능
- [ ] 주차 전환 속도 (1초 이내)
- [ ] 모달 open/close 애니메이션 부드러움

---

### 3.4 Goal Monthly 마이그레이션

**목표**: 월간 목표 Feature를 Next.js로 전환, 여러 Chart 컴포넌트를 Client Component로 변환

#### 3.4.1 현재 구조 분석

**AS-IS 폴더 구조**:
```
src/features/goal-monthly/
├── index.ts                                    # Feature 진입점
├── init.ts                                     # 초기화 로직
├── goal-monthly.css                            # Feature 스타일
├── components/
│   ├── Calendar/
│   │   ├── index.ts
│   │   ├── Calendar.ts                         # 월간 캘린더
│   │   └── Calendar.css
│   ├── RevenueTrend/
│   │   ├── index.ts
│   │   ├── RevenueTrend.ts                     # 매출 추이 차트
│   │   └── RevenueTrend.css
│   ├── MaChart/
│   │   ├── index.ts
│   │   ├── MaChartController.ts                # MA 차트 컨트롤러
│   │   ├── MaChartNew.ts                       # 신규 MA 차트
│   │   ├── MaChartExisting.ts                  # 기존 MA 차트
│   │   └── MaChart.css
│   ├── OutboundSection/
│   │   ├── index.ts
│   │   ├── OutboundSection.ts                  # 아웃바운드 섹션
│   │   └── OutboundSection.css
│   ├── MonthSelector/
│   │   ├── index.ts
│   │   ├── MonthSelector.ts                    # 월 선택기
│   │   └── MonthSelector.css
│   ├── ManagerTabs/
│   │   ├── index.ts
│   │   ├── ManagerTabs.ts                      # 담당자 탭
│   │   └── ManagerTabs.css
│   └── MiniCards/
│       ├── index.ts
│       ├── MiniCards.ts                        # KPI 미니 카드
│       └── MiniCards.css
└── lib/
    ├── state.ts                                # 전역 상태
    ├── charts.ts                               # 차트 설정 빌더
    └── types.ts                                # 타입 정의
```

**TO-BE 폴더 구조**:
```
src/app/goal/monthly/
├── page.tsx                                    # 월간 목표 페이지 (Server Component)
├── loading.tsx                                 # 로딩 UI
└── error.tsx                                   # 에러 UI

src/components/features/goal-monthly/
├── Calendar.tsx                                # 월간 캘린더 (Client Component)
├── RevenueTrendChart.tsx                       # 매출 추이 차트 (Client Component)
├── MaChart.tsx                                 # MA 차트 (Client Component)
├── MaChartTabs.tsx                             # MA 차트 탭
├── OutboundChart.tsx                           # 아웃바운드 차트 (Client Component)
├── MonthSelector.tsx                           # 월 선택기 (Client Component)
├── ManagerTabs.tsx                             # 담당자 탭 (Client Component)
└── MiniCards.tsx                               # KPI 미니 카드 (Server Component)

src/lib/features/goal-monthly/
├── calendar-builder.ts                         # 캘린더 데이터 빌더
├── ma-calculator.ts                            # MA 계산 로직
├── chart-config.ts                             # Chart.js 설정
└── types.ts                                    # 타입 정의
```

---

#### 3.4.2 Step 1: Page Component 생성

**1-1. 월간 목표 페이지** (`src/app/goal/monthly/page.tsx`)

```typescript
// TO-BE: src/app/goal/monthly/page.tsx
import { Suspense } from 'react';
import { fetchMonthlyGoals, fetchManagers, fetchMonthlyData } from '@/lib/api/server/goals';
import { MonthSelector } from '@/components/features/goal-monthly/MonthSelector';
import { ManagerTabs } from '@/components/features/goal-monthly/ManagerTabs';
import { MiniCards } from '@/components/features/goal-monthly/MiniCards';
import { Calendar } from '@/components/features/goal-monthly/Calendar';
import { RevenueTrendChart } from '@/components/features/goal-monthly/RevenueTrendChart';
import { MaChart } from '@/components/features/goal-monthly/MaChart';
import { OutboundChart } from '@/components/features/goal-monthly/OutboundChart';

export const metadata = {
  title: '월간 목표 | Ads Data Board',
  description: '월간 목표 및 실적 분석',
};

interface PageProps {
  searchParams: {
    month?: string;
    manager?: string;
  };
}

export default async function MonthlyGoalPage({ searchParams }: PageProps) {
  const currentMonth = searchParams.month || getCurrentMonth();
  const selectedManager = searchParams.manager || 'all';
  
  // 병렬로 데이터 fetch
  const [monthlyData, managers, goals] = await Promise.all([
    fetchMonthlyData(currentMonth, selectedManager),
    fetchManagers(),
    fetchMonthlyGoals(currentMonth, selectedManager),
  ]);
  
  return (
    <div className="monthly-goal-page">
      <header className="page-header">
        <h1>월간 목표</h1>
        <MonthSelector currentMonth={currentMonth} />
      </header>
      
      {/* 담당자 탭 */}
      <ManagerTabs 
        managers={managers} 
        selectedManager={selectedManager}
      />
      
      {/* KPI 미니 카드 */}
      <MiniCards data={monthlyData.kpis} />
      
      <div className="content-grid">
        {/* 좌측: 캘린더 */}
        <div className="left-section">
          <Suspense fallback={<CalendarSkeleton />}>
            <Calendar 
              month={currentMonth}
              goals={goals}
              dailyData={monthlyData.dailyData}
            />
          </Suspense>
        </div>
        
        {/* 우측: 차트들 */}
        <div className="right-section">
          {/* 매출 추이 차트 */}
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueTrendChart data={monthlyData.trendData} />
          </Suspense>
          
          {/* MA 차트 */}
          <Suspense fallback={<ChartSkeleton />}>
            <MaChart data={monthlyData.maData} />
          </Suspense>
          
          {/* 아웃바운드 차트 */}
          <Suspense fallback={<ChartSkeleton />}>
            <OutboundChart data={monthlyData.outboundData} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

---

#### 3.4.3 Step 2: Calendar 컴포넌트 변환

**2-1. Calendar** (`src/components/features/goal-monthly/Calendar.tsx`)

```typescript
// TO-BE: Client Component (날짜 클릭 인터랙션)
'use client';

import { useState } from 'react';
import { buildCalendarData } from '@/lib/features/goal-monthly/calendar-builder';
import type { DailyGoalData } from '@/lib/features/goal-monthly/types';

interface CalendarProps {
  month: string;
  goals: any[];
  dailyData: DailyGoalData[];
}

export function Calendar({ month, goals, dailyData }: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // 캘린더 데이터 빌드
  const calendarData = buildCalendarData(month, goals, dailyData);
  
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    // 날짜별 상세 정보 표시 (모달 또는 사이드바)
  };
  
  return (
    <div className="Calendar">
      <div className="calendar-header">
        <h3>{month} 목표 달성 현황</h3>
      </div>
      
      <div className="calendar-grid">
        {/* 요일 헤더 */}
        <div className="weekday-header">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>
        
        {/* 날짜 그리드 */}
        <div className="date-grid">
          {calendarData.map((dateInfo, index) => {
            const isToday = dateInfo.date === getTodayString();
            const isSelected = dateInfo.date === selectedDate;
            const isWeekend = dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6;
            const isHoliday = dateInfo.isHoliday;
            const achievementRate = dateInfo.achievementRate;
            
            return (
              <div
                key={index}
                className={`
                  calendar-cell
                  ${dateInfo.isCurrentMonth ? 'current-month' : 'other-month'}
                  ${isToday ? 'today' : ''}
                  ${isSelected ? 'selected' : ''}
                  ${isWeekend ? 'weekend' : ''}
                  ${isHoliday ? 'holiday' : ''}
                  ${achievementRate >= 100 ? 'achieved' : ''}
                `}
                onClick={() => dateInfo.isCurrentMonth && handleDateClick(dateInfo.date)}
              >
                <div className="date-number">{dateInfo.day}</div>
                
                {dateInfo.isCurrentMonth && dateInfo.hasData && (
                  <>
                    <div className="goal-indicator">
                      <div 
                        className="progress-fill"
                        style={{ width: `${Math.min(achievementRate, 100)}%` }}
                      />
                    </div>
                    <div className="achievement-text">
                      {achievementRate.toFixed(0)}%
                    </div>
                  </>
                )}
                
                {dateInfo.isHoliday && (
                  <div className="holiday-badge">{dateInfo.holidayName}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 범례 */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color achieved" />
          <span>목표 달성</span>
        </div>
        <div className="legend-item">
          <span className="legend-color not-achieved" />
          <span>미달성</span>
        </div>
        <div className="legend-item">
          <span className="legend-color holiday" />
          <span>공휴일</span>
        </div>
      </div>
    </div>
  );
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}
```

**2-2. Calendar Builder** (`src/lib/features/goal-monthly/calendar-builder.ts`)

```typescript
// 순수 함수 (Server/Client 모두 사용 가능)
import type { DailyGoalData, CalendarCell } from './types';

export function buildCalendarData(
  month: string,
  goals: any[],
  dailyData: DailyGoalData[]
): CalendarCell[] {
  const [year, monthNum] = month.split('-').map(Number);
  
  // 해당 월의 첫날과 마지막날
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  
  // 캘린더 그리드 시작일 (일요일부터)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // 캘린더 그리드 종료일 (토요일까지)
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  
  const cells: CalendarCell[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dateString = current.toISOString().slice(0, 10);
    const isCurrentMonth = current.getMonth() === monthNum - 1;
    
    // 해당 날짜의 데이터 찾기
    const dayData = dailyData.find((d) => d.date === dateString);
    
    cells.push({
      date: dateString,
      day: current.getDate(),
      dayOfWeek: current.getDay(),
      isCurrentMonth,
      isHoliday: dayData?.is_holiday || false,
      holidayName: dayData?.holiday_name,
      hasData: !!dayData,
      goalAmount: dayData?.goal_amount || 0,
      actualAmount: dayData?.actual_amount || 0,
      achievementRate: dayData
        ? (dayData.actual_amount / dayData.goal_amount) * 100
        : 0,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return cells;
}
```

---

#### 3.4.4 Step 3: MA Chart 컴포넌트 변환 (복잡한 차트)

**3-1. MaChart** (`src/components/features/goal-monthly/MaChart.tsx`)

```typescript
// TO-BE: Client Component (Chart.js 사용)
'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { buildMaChartConfig } from '@/lib/features/goal-monthly/chart-config';
import type { MaChartData } from '@/lib/features/goal-monthly/types';

interface MaChartProps {
  data: MaChartData;
}

export function MaChart({ data }: MaChartProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // 이전 차트 제거
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    // 탭에 따라 데이터 선택
    const chartData = activeTab === 'new' ? data.newData : data.existingData;
    
    // Chart 설정
    const config: ChartConfiguration = buildMaChartConfig(chartData, activeTab);
    
    // Chart 생성
    chartRef.current = new Chart(canvasRef.current, config);
    
    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, activeTab]);
  
  return (
    <div className="MaChart">
      <div className="chart-header">
        <h3>MA (이동 평균) 추이</h3>
        
        {/* 탭 */}
        <div className="chart-tabs">
          <button
            className={`tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            신규
          </button>
          <button
            className={`tab ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            기존
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <canvas ref={canvasRef} />
      </div>
      
      {/* 범례 설명 */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-line ma5" />
          <span>5일 이동평균</span>
        </div>
        <div className="legend-item">
          <span className="legend-line ma10" />
          <span>10일 이동평균</span>
        </div>
        <div className="legend-item">
          <span className="legend-line ma20" />
          <span>20일 이동평균</span>
        </div>
      </div>
    </div>
  );
}
```

**3-2. MA 계산 로직** (`src/lib/features/goal-monthly/ma-calculator.ts`)

```typescript
// 순수 함수
export function calculateMovingAverage(
  data: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

export function buildMaData(dailyData: DailyGoalData[]) {
  const amounts = dailyData.map((d) => d.actual_amount);
  
  return {
    dates: dailyData.map((d) => d.date),
    actual: amounts,
    ma5: calculateMovingAverage(amounts, 5),
    ma10: calculateMovingAverage(amounts, 10),
    ma20: calculateMovingAverage(amounts, 20),
  };
}
```

**3-3. Chart Config Builder** (`src/lib/features/goal-monthly/chart-config.ts`)

```typescript
import type { ChartConfiguration } from 'chart.js/auto';

export function buildMaChartConfig(
  data: any,
  type: 'new' | 'existing'
): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: data.dates,
      datasets: [
        {
          label: '실제 매출',
          data: data.actual,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: 'MA5',
          data: data.ma5,
          borderColor: 'rgb(16, 185, 129)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'MA10',
          data: data.ma10,
          borderColor: 'rgb(245, 158, 11)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'MA20',
          data: data.ma20,
          borderColor: 'rgb(239, 68, 68)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: type === 'new' ? '신규 MA 추이' : '기존 MA 추이',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value?.toLocaleString()}원`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `${value.toLocaleString()}원`,
          },
        },
      },
    },
  };
}
```

---

#### 3.4.5 Step 4: RevenueTrendChart 변환

**4-1. RevenueTrendChart** (`src/components/features/goal-monthly/RevenueTrendChart.tsx`)

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import type { RevenueTrendData } from '@/lib/features/goal-monthly/types';

interface RevenueTrendChartProps {
  data: RevenueTrendData;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.dates,
        datasets: [
          {
            type: 'line',
            label: '누적 매출',
            data: data.cumulative,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            yAxisID: 'y1',
          },
          {
            type: 'bar',
            label: '일별 매출',
            data: data.daily,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: '목표',
            data: data.goal,
            borderColor: 'rgb(34, 197, 94)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: '월간 매출 추이',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '일별 매출',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '누적 매출',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    };
    
    chartRef.current = new Chart(canvasRef.current, config);
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);
  
  return (
    <div className="RevenueTrendChart">
      <div className="chart-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
```

---

#### 3.4.6 마이그레이션 체크리스트 (Goal Monthly)

- [ ] `src/app/goal/monthly/page.tsx` 생성
- [ ] `src/components/features/goal-monthly/Calendar.tsx` 변환
- [ ] `src/components/features/goal-monthly/RevenueTrendChart.tsx` 변환
- [ ] `src/components/features/goal-monthly/MaChart.tsx` 변환
- [ ] `src/components/features/goal-monthly/OutboundChart.tsx` 변환
- [ ] `src/components/features/goal-monthly/MonthSelector.tsx` 변환
- [ ] `src/components/features/goal-monthly/ManagerTabs.tsx` 변환
- [ ] `src/lib/features/goal-monthly/calendar-builder.ts` 생성
- [ ] `src/lib/features/goal-monthly/ma-calculator.ts` 생성
- [ ] `src/lib/features/goal-monthly/chart-config.ts` 생성
- [ ] 여러 Chart 컴포넌트를 Client Component로 변환
- [ ] Chart.js 초기화/cleanup 로직 구현
- [ ] `src/features/goal-monthly/` 폴더 삭제

---

#### 3.4.7 예상 이슈 및 해결 방안 (Goal Monthly)

| 이슈 | 원인 | 해결 방안 |
|-----|------|---------|
| 여러 차트 동시 렌더링 시 성능 저하 | Chart.js 인스턴스 다수 생성 | Suspense로 lazy loading, 필요 시 가상 스크롤 |
| MA 계산이 느림 | 대용량 데이터 처리 | Worker Thread 사용 또는 Server에서 계산 |
| 캘린더 셀 클릭 이벤트 충돌 | 이벤트 버블링 | `stopPropagation()` 사용 |
| Chart resize 깨짐 | 컨테이너 크기 변화 감지 안 함 | `responsive: true` 옵션, ResizeObserver 사용 |
| 탭 전환 시 차트 깜빡임 | 차트 재생성 | `useEffect` 의존성 최적화, 데이터만 업데이트 |

---

#### 3.4.8 테스트 계획 (Goal Monthly)

**기능 테스트**:
- [ ] 캘린더에 목표 달성률 표시
- [ ] 캘린더 날짜 클릭 시 상세 정보
- [ ] 매출 추이 차트 렌더링
- [ ] MA 차트 탭 전환 (신규/기존)
- [ ] 아웃바운드 차트 표시
- [ ] 월 선택기로 이전/다음 월 이동
- [ ] 담당자 탭 전환

**성능 테스트**:
- [ ] 4개 차트 동시 렌더링 성능
- [ ] 캘린더 42개 셀 렌더링 속도
- [ ] 차트 애니메이션 부드러움
- [ ] 메모리 누수 없음 (차트 cleanup 확인)

---

### 3.5 Settings 마이그레이션

**목표**: 설정 Feature를 Goal Setting / Manager Setting 별도 페이지로 분리, inline 편집 기능을 React 방식으로 구현

*(상세 가이드는 Dashboard와 유사한 구조로 작성 예정)*

---

#### Phase 4: 공통 UI 컴포넌트
```
AS-IS                                    TO-BE
─────────────────────────────────────────────────────────────
src/shared/ui/common/Toast/          →  src/components/ui/Toast/
src/shared/ui/common/Dropdown/       →  src/components/ui/Dropdown/
src/shared/ui/common/DatePicker/     →  src/components/ui/DatePicker/
src/shared/ui/common/Tabs/           →  src/components/ui/Tabs/
src/shared/ui/common/Table/          →  src/components/ui/Table/
src/shared/ui/modals/                →  src/components/ui/Modal/
```

### 9.7 삭제 대상 파일/폴더

다음 항목들은 Next.js로 마이그레이션하면서 **제거**됩니다:

```
✗ src/main.ts                          # Next.js가 자동 진입점 생성
✗ src/app/bootstrap.ts                 # app/layout.tsx와 providers.tsx로 대체
✗ src/app/init-globals.ts              # 환경 변수 및 클라이언트 초기화 방식 변경
✗ src/features/navigation/             # Next.js Router로 대체
✗ src/shared/lib/event-bus.ts          # React Props/Context로 대체
✗ src/shared/lib/cache.ts (DOM 캐시)   # React가 자동 관리
✗ src/shared/lib/request-manager.ts    # React Query로 대체
✗ index.html                           # Next.js가 자동 생성
✗ vite.config.ts                       # next.config.js로 대체
```

---

## 10. 파일 및 기능 매핑 테이블 (마이그레이션 맵)

### 10.1 핵심 설정 파일

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주요 주의사항 |
|---------------------------|----------------------------------|---------|---------------------------|
| `index.html` | 삭제 (Next.js 자동 생성) | - | Next.js가 자동으로 HTML 생성, `<head>` 메타 태그는 `app/layout.tsx`의 `metadata` export로 이동 |
| `src/main.ts` | 삭제 (Next.js 자동 진입점) | - | `DOMContentLoaded` 로직은 `app/layout.tsx`로, 초기화는 클라이언트 컴포넌트의 `useEffect`로 이동 |
| `src/app/bootstrap.ts` | `src/app/layout.tsx` + `src/app/providers.tsx` | 모듈 → React Component | 앱 초기화를 Root Layout과 Provider로 분리, Feature 초기화는 각 페이지 컴포넌트로 이동 |
| `src/app/init-globals.ts` | `src/lib/supabase/client.ts` + `src/lib/supabase/server.ts` | 전역 초기화 → 모듈 export | `window.supabase` 제거, 함수 호출 방식으로 변경, Chart.js는 Client Component에서 lazy import |
| `vite.config.ts` | `next.config.js` | Vite 설정 → Next.js 설정 | Path alias 재설정, 빌드 최적화 옵션 조정 |
| `tsconfig.json` | `tsconfig.json` (수정) | - | `compilerOptions.paths` 업데이트 (`@/` prefix), `jsx: "preserve"` 추가 |
| `.env` | `.env.local` | - | Next.js는 `.env.local` 우선, `VITE_` prefix 제거 → `NEXT_PUBLIC_` 사용 |

### 10.2 공통 타입 및 유틸리티

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주요 주의사항 |
|---------------------------|----------------------------------|---------|---------------------------|
| `src/shared/types/index.ts` | `src/types/index.ts` | 이동 (동일) | 경로 import 업데이트 필요 |
| `src/shared/types/database.types.ts` | `src/types/database.types.ts` | 이동 (동일) | Supabase CLI 타입 생성 경로 업데이트 |
| `src/shared/lib/utils/date.ts` | `src/lib/utils/date.ts` | 이동 (동일) | 순수 함수이므로 변경 없음, 서버/클라이언트 모두 사용 가능 |
| `src/shared/lib/utils/constants.ts` | `src/lib/utils/constants.ts` | 이동 (동일) | 상수이므로 변경 없음 |
| `src/shared/lib/cache.ts` (데이터 캐시 부분) | 삭제 (React Query로 대체) | Module Cache → React Query | `cache.shared_manager`, `cache.clients` 등은 React Query의 `useQuery`로 대체 |
| `src/shared/lib/cache.ts` (DOM 캐시 부분) | 삭제 (React 자동 관리) | DOM Cache → React Refs | `getCachedElement`, `getCachedElementById` 등은 `useRef` 또는 직접 접근으로 대체 |
| `src/shared/lib/event-bus.ts` | 삭제 또는 `src/lib/events/goal-events.ts` | Event Bus → Props/Context/Zustand | `emit('goal:submitted')` → Props callback 또는 Zustand action 호출로 변경 |
| `src/shared/lib/request-manager.ts` | 삭제 (React Query로 대체) | Request Deduplication → React Query | React Query가 자동으로 중복 요청 방지, `requestManager.dedupe()` 제거 |
| `src/shared/lib/chart-utils.ts` | `src/lib/utils/chart-utils.ts` | 이동 (동일) | Chart.js 관련 유틸은 Client Component에서만 사용 |

### 10.3 API 레이어

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/shared/api/supabase-client.ts` | `src/lib/api/client/supabase.ts` + `src/lib/api/server/supabase.ts` | Client 분리 | **Client**: `createClientComponentClient()` 사용<br/>**Server**: `createServerComponentClient()` 또는 `createRouteHandlerClient()` 사용<br/>`window.supabase` 제거 |
| `src/shared/api/api.ts` | `src/lib/api/server/managers.ts` + `src/lib/api/client/managers.ts` | Server/Client 분리 | **Server Component**: `src/lib/api/server/managers.ts`에서 직접 DB 조회<br/>**Client Component**: `src/lib/api/client/managers.ts`에서 API Route 호출 또는 Supabase Client 사용 |
| `src/shared/api/goal-api.ts` | `src/lib/api/server/goals.ts` + `src/lib/api/client/goals.ts` | Server/Client 분리 | CRUD 로직은 Server Actions 또는 API Routes로 이동 고려<br/>React Query의 `useMutation` 활용 |
| `src/shared/api/report-api.ts` | `src/lib/api/server/reports.ts` + `src/lib/api/client/reports.ts` | Server/Client 분리 | 리포트 데이터 fetching은 Server Component에서 처리 권장<br/>필터링은 Client에서 처리 |

### 10.4 전역 스타일

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/app/styles/main.css` | `src/app/globals.css` | 이름 변경 + 이동 | `app/layout.tsx`에서 import |
| `src/app/styles/base/reset.css` | `src/styles/reset.css` | 이동 | `globals.css`에서 import |
| `src/app/styles/base/typography.css` | `src/styles/typography.css` | 이동 | 동일 |
| `src/app/styles/base/buttons.css` | `src/styles/buttons.css` | 이동 | 동일 |
| `src/app/styles/base/layout.css` | `src/styles/layout.css` | 이동 | 동일 |
| `src/app/styles/base/utilities.css` | `src/styles/utilities.css` | 이동 | 동일 |
| `src/app/styles/tokens/*.css` | `src/styles/variables.css` | 통합 | CSS 변수를 단일 파일로 통합 가능 (선택적) |

### 10.5 레이아웃 및 네비게이션

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/shared/ui/common/AppShell/AppShell.ts` | `src/app/layout.tsx` | Class Component → React Layout | `render()` → JSX return<br/>`destroy()` 제거 (React가 자동 관리)<br/>`<html>`, `<body>` 태그 포함 |
| `src/shared/ui/common/Sidebar/Sidebar.ts` | `src/components/ui/Sidebar/Sidebar.tsx` | Class Component → React Client Component | `addEventListener` → `onClick` prop<br/>네비게이션: Next.js `<Link>` 사용<br/>활성 상태: `usePathname()` 훅 사용 |
| `src/features/navigation/lib/router.ts` | 삭제 (Next.js Router) | Custom Router → Next.js App Router | `setupNavigation()` 제거<br/>페이지 전환은 파일 시스템 라우팅<br/>Feature `init()`/`destroy()` 로직은 페이지 컴포넌트의 `useEffect`로 이동 |
| `src/features/navigation/lib/route-config.ts` | 삭제 | Dynamic Import → Automatic Code Splitting | Next.js가 자동으로 페이지별 코드 스플리팅 수행 |

### 10.6 공통 UI 컴포넌트

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/shared/ui/common/Toast/Toast.ts` | `src/components/ui/Toast/Toast.tsx` + `src/components/ui/Toast/ToastProvider.tsx` | Class Component → React Client Component + Context | `showToast()` → `useToast()` 훅<br/>전역 상태는 React Context 또는 Zustand<br/>Portal 사용 권장 |
| `src/shared/ui/common/Dropdown/Dropdown.ts` | `src/components/ui/Dropdown/Dropdown.tsx` | Class Component → React Client Component | `render()` → JSX<br/>`addEventListener` → `onClick`<br/>상태 관리: `useState` |
| `src/shared/ui/common/DatePicker/index.ts` | `src/components/ui/DatePicker/DatePicker.tsx` | Class Component → React Client Component | 날짜 상태: `useState`<br/>이벤트: `onChange` prop<br/>외부 라이브러리 고려 (react-datepicker 등) |
| `src/shared/ui/common/Tabs/Tabs.ts` | `src/components/ui/Tabs/Tabs.tsx` | Class Component → React Client Component | 활성 탭 상태: `useState`<br/>탭 전환: `onClick` + 상태 업데이트 |
| `src/shared/ui/common/Table/Table.ts` | `src/components/ui/Table/Table.tsx` | Class Component → React Client Component | 테이블 데이터: Props로 전달<br/>정렬/필터: `useState` + 로직 분리 |
| `src/shared/ui/modals/DataUpdateModal/index.ts` | `src/components/ui/Modal/DataUpdateModal.tsx` | Class Component → React Client Component | 모달 상태: `useState` 또는 Zustand<br/>Portal 사용<br/>Backdrop 클릭 처리 |

### 10.7 Dashboard Feature

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/features/dashboard/index.ts` (`initDashboardPage()`) | `src/app/dashboard/page.tsx` | Feature Entry → React Server Component | 데이터 fetching을 Server Component에서 직접 수행<br/>차트 등 interactive 요소는 Client Component로 분리<br/>`init()`/`destroy()` 제거 |
| `src/features/dashboard/components/KpiCard/KpiCard.ts` | `src/components/features/dashboard/KpiCard.tsx` | Class Component → React Server Component | KPI 계산 로직은 Server에서 처리<br/>Props로 데이터 전달<br/>`render()` → JSX return |
| `src/features/dashboard/components/RevenueChart/RevenueChart.ts` | `src/components/features/dashboard/RevenueChart.tsx` | Class Component → React Client Component | **Client Component 필수** (Chart.js 사용)<br/>`'use client'` 지시어 추가<br/>Chart.js 초기화는 `useEffect`에서<br/>차트 인스턴스: `useRef`로 관리<br/>cleanup: `useEffect` return 함수 |
| `src/features/dashboard/components/MonthSelector/MonthSelector.ts` | `src/components/features/dashboard/MonthSelector.tsx` | Class Component → React Client Component | 월 선택 상태: `useState` 또는 URL 쿼리 파라미터<br/>이벤트: `onChange` prop |
| `src/features/dashboard/components/ManagerPerformance/ManagerPerformance.ts` | `src/components/features/dashboard/ManagerPerformanceTable.tsx` | Class Component → React Server Component | 테이블 데이터는 Server에서 fetch<br/>정렬은 Client에서 처리 가능 |
| `src/features/dashboard/lib/kpi.ts` | `src/lib/features/dashboard/kpi-calculator.ts` | 이동 (동일) | 순수 함수이므로 Server/Client 모두 사용 가능 |
| `src/features/dashboard/lib/load.ts` | `src/app/dashboard/page.tsx` (inline) | Data Loading → Server Component | `loadDashboardCharts()` 제거<br/>Server Component에서 직접 DB 조회<br/>React Query는 Client Component에서만 |

### 10.8 Reports Feature

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/features/reports/index.ts` | `src/app/reports/daily/page.tsx` + `src/app/reports/weekly/page.tsx` | Feature Entry → React Pages | Daily/Weekly를 별도 페이지로 분리<br/>공통 레이아웃은 `src/app/reports/layout.tsx` |
| `src/features/reports/components/ReportFilters/index.ts` | `src/components/features/reports/ReportFilters.tsx` | Class Component → React Client Component | 필터 상태: `useState` 또는 URL searchParams<br/>필터 변경: `onChange` → 상태 업데이트<br/>URL 동기화 권장 (`useSearchParams`) |
| `src/features/reports/components/ReportTable/index.ts` | `src/components/features/reports/ReportTable.tsx` | Class Component → React Client Component | 테이블 데이터: Props<br/>정렬/페이지네이션: `useState`<br/>가상 스크롤 고려 (대용량 데이터) |
| `src/features/reports/components/StatusCards/StatusCards.ts` | `src/components/features/reports/StatusCards.tsx` | Class Component → React Server Component | 카드 데이터는 Server에서 계산<br/>클릭 이벤트는 Client Component로 분리 |
| `src/features/reports/lib/daily/filters.ts` | `src/lib/features/reports/daily-filters.ts` | 이동 + 이름 변경 | 순수 함수, Server/Client 모두 사용 가능 |
| `src/features/reports/lib/weekly/filters.ts` | `src/lib/features/reports/weekly-filters.ts` | 이동 + 이름 변경 | 순수 함수, Server/Client 모두 사용 가능 |
| `src/features/reports/lib/weekly-report-data.ts` | `src/lib/api/server/reports.ts` | Data Loading → Server API | Server Component나 API Route에서 호출<br/>React Query는 Client에서 사용 |

### 10.9 Goal Weekly Feature

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/features/goal-weekly/index.ts` | `src/app/goal/weekly/page.tsx` | Feature Entry → React Server Component | 주간 목표 목록 데이터는 Server에서 fetch<br/>담당자 탭은 Client Component |
| `src/features/goal-weekly/lib/state.ts` (`weeklyGoalState`) | `src/lib/stores/use-goal-store.ts` | Module State → Zustand Store | `weeklyGoalState` → `useGoalStore()`<br/>`window.weeklyGoalState` 제거<br/>타입 안전한 접근 |
| `src/features/goal-weekly/components/GoalCard/GoalCard.ts` | `src/components/features/goal-weekly/GoalCard.tsx` | Class Component → React Client Component | 목표 데이터: Props<br/>편집/삭제 이벤트: `onClick` prop<br/>상태는 부모에서 관리 또는 Zustand |
| `src/features/goal-weekly/components/GoalRegisterModal/index.ts` | `src/components/features/goal-weekly/GoalRegisterModal.tsx` | Class Component → React Client Component | 모달 상태: `useState` 또는 Zustand<br/>폼 상태: `useState` 또는 React Hook Form<br/>제출: Server Action 또는 API Route |
| `src/features/goal-weekly/components/GoalRegisterModal/validation/form-validator.ts` | `src/lib/features/goal-weekly/validation.ts` | 이동 (동일) | 순수 함수, Zod 스키마로 변환 고려 |
| `src/features/goal-weekly/components/GoalRegisterModal/services/goal-service.ts` | `src/lib/api/client/goals.ts` | Service → API Client | React Query의 `useMutation` 사용<br/>낙관적 업데이트 고려 |
| `src/features/goal-weekly/components/WeekNavigation/index.ts` | `src/components/features/goal-weekly/WeekNavigation.tsx` | Class Component → React Client Component | 주차 상태: `useState` 또는 URL params<br/>이전/다음 버튼: `onClick` + 상태 업데이트 |
| `src/features/goal-weekly/lib/week-data-loader.ts` | `src/lib/api/server/goals.ts` | Data Loading → Server API | Server Component에서 호출<br/>주차 계산은 `shared_week` 테이블 기준 |

### 10.10 Goal Monthly Feature

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/features/goal-monthly/index.ts` | `src/app/goal/monthly/page.tsx` | Feature Entry → React Server Component | 월간 데이터는 Server에서 fetch<br/>차트는 Client Component로 분리 |
| `src/features/goal-monthly/lib/state.ts` (`state`) | `src/lib/stores/use-goal-store.ts` | Module State → Zustand Store | `state.selectedMonth` → `useGoalStore()`<br/>월 선택은 URL params 고려 |
| `src/features/goal-monthly/components/Calendar/Calendar.ts` | `src/components/features/goal-monthly/Calendar.tsx` | Class Component → React Client Component | 캘린더 데이터: Props<br/>일자 클릭: `onClick` prop<br/>외부 라이브러리 고려 (react-calendar) |
| `src/features/goal-monthly/components/RevenueTrend/RevenueTrend.ts` | `src/components/features/goal-monthly/RevenueTrendChart.tsx` | Class Component → React Client Component | **Client Component 필수** (Chart.js)<br/>`useEffect`로 차트 초기화<br/>차트 인스턴스: `useRef` |
| `src/features/goal-monthly/components/MaChart/index.ts` | `src/components/features/goal-monthly/MaChart.tsx` | Multiple Classes → React Client Component | **Client Component 필수**<br/>여러 차트 컨트롤러를 하나의 컴포넌트로 통합<br/>탭 전환: `useState` |
| `src/features/goal-monthly/components/OutboundSection/OutboundSection.ts` | `src/components/features/goal-monthly/OutboundChart.tsx` | Class Component → React Client Component | **Client Component 필수**<br/>아웃바운드 데이터: Props 또는 훅<br/>차트 초기화: `useEffect` |
| `src/features/goal-monthly/components/MonthSelector/MonthSelector.ts` | `src/components/features/goal-monthly/MonthSelector.tsx` | Class Component → React Client Component | 월 선택 상태: `useState` 또는 URL params<br/>이전/다음 월: `onClick` |
| `src/features/goal-monthly/components/ManagerTabs/ManagerTabs.ts` | `src/components/features/goal-monthly/ManagerTabs.tsx` | Class Component → React Client Component | 활성 탭 상태: `useState` 또는 Zustand<br/>탭 전환: `onClick` |
| `src/features/goal-monthly/lib/charts.ts` | `src/lib/features/goal-monthly/chart-builder.ts` | 이동 + 이름 변경 | Chart.js 설정 빌더, Client에서만 사용 |

### 10.11 Settings Feature

| 현재 파일/기능 (AS-IS Path) | 이동할 폴더 및 파일명 (TO-BE Path) | 변환 방식 | 마이그레이션 시 주의사항 |
|---------------------------|----------------------------------|---------|----------------------|
| `src/features/settings/index.ts` | `src/app/settings/goal-setting/page.tsx` + `src/app/settings/manager-setting/page.tsx` | Feature Entry → React Pages | 두 개의 설정 페이지로 분리<br/>공통 레이아웃: `src/app/settings/layout.tsx` |
| `src/features/settings/components/GoalSettingTable/index.ts` | `src/components/features/settings/GoalSettingTable.tsx` | Class Component → React Client Component | 테이블 데이터: Server에서 fetch → Props<br/>inline 편집: `useState`<br/>저장: Server Action 또는 API Route<br/>낙관적 업데이트 고려 |
| `src/features/settings/components/GoalSettingTable/CellChangeHandler.ts` | `src/components/features/settings/GoalSettingTable.tsx` (inline) | Event Handler → React Handler | `addEventListener` → `onClick`, `onBlur`<br/>셀 편집 상태: `useState` |
| `src/features/settings/components/ManagerSettingTable/ManagerSettingTable.ts` | `src/components/features/settings/ManagerSettingTable.tsx` | Class Component → React Client Component | 담당자 데이터: Server → Props<br/>정렬/필터: `useState`<br/>CRUD: Server Action |
| `src/features/settings/components/ManagerSettingTable/manager-setting-api.ts` | `src/lib/api/server/managers.ts` | API Functions → Server API | Server Component나 Server Action에서 호출 |
| `src/features/settings/lib/events.ts` | 삭제 또는 inline | Event Handlers → React Handlers | 이벤트 핸들러를 컴포넌트 내부로 이동<br/>Props callback 패턴 사용 |

### 10.12 커스텀 훅 (신규 생성)

다음은 마이그레이션 과정에서 **새로 생성**해야 하는 커스텀 훅들입니다:

| 훅 이름 | 파일 경로 (TO-BE) | 역할 | 기존 코드에서 이동 |
|--------|------------------|------|------------------|
| `useSupabase()` | `src/hooks/use-supabase.ts` | Supabase 클라이언트 접근 | `getSupabaseClient()` 래퍼 |
| `useManagers()` | `src/hooks/use-managers.ts` | 담당자 목록 조회 | `fetchSharedManagers()` + React Query |
| `useGoals()` | `src/hooks/use-goals.ts` | 목표 CRUD | `goal-api.ts` + React Query |
| `useWeeklyGoals()` | `src/hooks/use-weekly-goals.ts` | 주간 목표 조회 | `goal-weekly/lib/` + React Query |
| `useMonthlyGoals()` | `src/hooks/use-monthly-goals.ts` | 월간 목표 조회 | `goal-monthly/lib/` + React Query |
| `useReports()` | `src/hooks/use-reports.ts` | 리포트 데이터 조회 | `report-api.ts` + React Query |
| `useToast()` | `src/hooks/use-toast.ts` | 토스트 알림 제어 | `showToast()` + Context/Zustand |
| `useModal()` | `src/hooks/use-modal.ts` | 모달 열기/닫기 | 모달 상태 관리 로직 |
| `useDatePicker()` | `src/hooks/use-date-picker.ts` | 날짜 선택 상태 | DatePicker 로직 |
| `useDebounce()` | `src/hooks/use-debounce.ts` | 입력 디바운싱 | 신규 (검색 필터 등에 사용) |
| `useLocalStorage()` | `src/hooks/use-local-storage.ts` | localStorage 동기화 | 신규 (테마, 사용자 설정 등) |

### 10.13 마이그레이션 복잡도 레벨

각 파일/기능의 마이그레이션 난이도를 3단계로 분류:

| 레벨 | 설명 | 해당 파일 예시 |
|------|------|--------------|
| 🟢 **LOW** | 단순 이동 또는 최소 변경 | 타입 파일, 유틸리티 함수, CSS 파일 |
| 🟡 **MEDIUM** | 구조 변경 필요 (Class → Function Component) | 대부분의 UI 컴포넌트, 간단한 페이지 |
| 🔴 **HIGH** | 복잡한 로직 재구성 (상태 관리, 차트, 모달) | Chart 컴포넌트, 복잡한 폼, 전역 상태 |

#### 레벨별 파일 목록

**🟢 LOW (단순 이동)**
- 모든 타입 파일 (`*.types.ts`)
- 유틸리티 함수 (`src/shared/lib/utils/`)
- CSS 파일
- 상수 파일

**🟡 MEDIUM (구조 변경)**
- 단순 UI 컴포넌트 (Button, Card, Tabs)
- 페이지 컴포넌트 (데이터 fetching만 있는 경우)
- API 함수 (순수 데이터 조회)

**🔴 HIGH (복잡한 재구성)**
- Chart 컴포넌트 (Chart.js 사용)
- 모달 컴포넌트 (Portal, 전역 상태)
- 복잡한 폼 (GoalRegisterModal)
- 테이블 (inline 편집, 정렬, 필터)
- 전역 상태 관리 (Event Bus → Zustand)

### 10.14 마이그레이션 체크리스트

각 파일 마이그레이션 시 확인해야 할 항목:

- [ ] **변환 방식 확인**: Class → Function Component, Event → React Handler
- [ ] **Client/Server 구분**: `'use client'` 지시어 필요 여부
- [ ] **상태 관리**: Module State → `useState`/Zustand
- [ ] **이벤트 처리**: `addEventListener` → `onClick` props
- [ ] **DOM 조작**: `innerHTML` → JSX, `querySelector` → `useRef`
- [ ] **데이터 Fetching**: 직접 호출 → React Query/Server Component
- [ ] **의존성 제거**: `window` 객체, Event Bus, Request Manager
- [ ] **스타일**: CSS import, CSS Modules 적용 여부
- [ ] **TypeScript**: 타입 정의, Props 인터페이스
- [ ] **Cleanup**: `destroy()` → `useEffect` cleanup function

---

## 11. 공용 UI 컴포넌트 및 유틸리티 식별

### 11.1 공용 UI 컴포넌트 분석

Next.js 환경에서 재사용 가능한 React 컴포넌트로 전환할 수 있는 UI 요소들을 식별했습니다.

#### 11.1.1 기본 UI 컴포넌트 (Primitive Components)

| 컴포넌트명 | 현재 구현 위치 | TO-BE 경로 | 설계 방향 | 우선순위 |
|-----------|--------------|-----------|----------|---------|
| **Button** | 중복 생성 (여러 Feature에서) | `src/components/ui/Button/Button.tsx` | variant (primary, secondary, danger), size (sm, md, lg), disabled, loading state 지원 | 🔴 HIGH |
| **Input** | 중복 생성 (폼 입력) | `src/components/ui/Input/Input.tsx` | type, placeholder, error message, validation state, prefix/suffix icon 지원 | 🔴 HIGH |
| **Select** | `loadManagerList()` (ui-helpers.ts) | `src/components/ui/Select/Select.tsx` | 옵션 리스트 Props, onChange callback, placeholder, 검색 기능(선택적) | 🟡 MEDIUM |
| **Card** | 중복 생성 (KpiCard, StatusCard 등) | `src/components/ui/Card/Card.tsx` | header, body, footer slot, padding variants, border/shadow styles | 🟡 MEDIUM |
| **Badge** | Status 표시 (여러 곳) | `src/components/ui/Badge/Badge.tsx` | color variants (success, warning, danger, info), size, rounded | 🟢 LOW |
| **Spinner** | 로딩 표시 (여러 곳) | `src/components/ui/Spinner/Spinner.tsx` | size, color, full-page overlay variant | 🟡 MEDIUM |
| **Divider** | 섹션 구분 (여러 곳) | `src/components/ui/Divider/Divider.tsx` | orientation (horizontal, vertical), spacing | 🟢 LOW |

#### 11.1.2 복합 UI 컴포넌트 (Composite Components)

| 컴포넌트명 | 현재 구현 | TO-BE 경로 | 설계 방향 | 우선순위 |
|-----------|----------|-----------|----------|---------|
| **Modal** | `DataUpdateModal`, `GoalRegisterModal` 등 | `src/components/ui/Modal/Modal.tsx` | **Client Component**, Portal 사용, title/body/footer slot, onClose callback, backdrop 클릭 처리, ESC 키 지원 | 🔴 HIGH |
| **Toast** | `showToast()` (ui-helpers.ts) | `src/components/ui/Toast/Toast.tsx` + `ToastProvider.tsx` | **Client Component**, Context API로 전역 관리, position, duration, type (success, error, info), auto-dismiss, 다중 토스트 스택 | 🔴 HIGH |
| **Dropdown** | Sidebar 메뉴, 설정 | `src/components/ui/Dropdown/Dropdown.tsx` | **Client Component**, trigger/content pattern, auto-positioning, outside click 처리, 키보드 네비게이션 | 🟡 MEDIUM |
| **DatePicker** | `src/shared/ui/common/DatePicker/` | `src/components/ui/DatePicker/DatePicker.tsx` | **Client Component**, 달력 그리드, 월/년 네비게이션, 오늘 버튼, range 선택(선택적), 외부 라이브러리 고려 (react-datepicker) | 🔴 HIGH |
| **Tabs** | Goal 페이지, Settings | `src/components/ui/Tabs/Tabs.tsx` | **Client Component**, 활성 탭 관리, 탭 전환 애니메이션, URL 동기화(선택적) | 🟡 MEDIUM |
| **Table** | Reports, Settings | `src/components/ui/Table/Table.tsx` | **Client Component**, 헤더/바디 구조, 정렬, 페이지네이션, 행 선택, sticky header, 가상 스크롤(대용량 데이터) | 🔴 HIGH |

#### 11.1.3 도메인 특화 컴포넌트 (Domain-Specific Components)

| 컴포넌트명 | 현재 구현 | TO-BE 경로 | 설계 방향 | 우선순위 |
|-----------|----------|-----------|----------|---------|
| **KpiCard** | `features/dashboard/components/KpiCard/` | `src/components/features/dashboard/KpiCard.tsx` | **Server Component** 가능, KPI 데이터 Props, variant (daily, weekly, monthly, expected), 증감률 표시, 아이콘 | 🟡 MEDIUM |
| **StatusCard** | `features/reports/components/StatusCards/` | `src/components/features/reports/StatusCard.tsx` | 상태별 카드, 클릭 필터링, 활성 상태 표시 | 🟡 MEDIUM |
| **ChartWrapper** | Chart.js 사용 컴포넌트들 | `src/components/ui/ChartWrapper/ChartWrapper.tsx` | **Client Component 필수**, Chart.js 초기화/cleanup 로직, resize 처리, loading/error state | 🔴 HIGH |
| **MonthSelector** | Dashboard, Goal Monthly | `src/components/features/shared/MonthSelector.tsx` | 월 선택 UI, 이전/다음 버튼, 현재 월 표시, onChange callback | 🟡 MEDIUM |
| **WeekNavigation** | Goal Weekly | `src/components/features/goal-weekly/WeekNavigation.tsx` | 주차 선택 UI, 이전/다음 버튼, 주차 정보 표시 | 🟡 MEDIUM |
| **ManagerTabs** | Goal Monthly, Goal Weekly | `src/components/features/shared/ManagerTabs.tsx` | 담당자 탭 UI, 활성 탭 관리, 전체/개별 담당자 전환 | 🟡 MEDIUM |

### 11.2 공용 유틸리티 함수 분석

#### 11.2.1 그대로 사용 가능한 순수 함수 (Pure Utilities)

| 유틸리티 | 현재 위치 | TO-BE 경로 | 함수 목록 | 사용처 |
|---------|----------|-----------|----------|--------|
| **날짜 포맷팅** | `src/shared/lib/utils/date.ts` | `src/lib/utils/date.ts` | `formatDate()`, `formatDateDisplay()`, `formatDateForHeader()` | Server/Client 모두 |
| **숫자 포맷팅** | `src/shared/lib/utils/format.ts` | `src/lib/utils/format.ts` | `formatNumberWithCommas()`, `removeCommas()`, `formatRevenueNumber()` | Server/Client 모두 |
| **문자열 정제** | `src/shared/lib/utils/format.ts` | `src/lib/utils/format.ts` | `cleanClientName()`, `cleanClientNameShort()` | Server/Client 모두 |
| **HTML 이스케이프** | `src/shared/lib/utils/escape.ts` | `src/lib/utils/escape.ts` | `escapeHtml()` | Client (보안) |
| **목표 계산** | `src/shared/lib/utils/goals.ts` | `src/lib/utils/goals.ts` | `calculateGoalMetrics()`, `getAchievementColorClass()`, `getMetricColorClasses()` | Server/Client 모두 |
| **에러 처리** | `src/shared/lib/utils/error.ts` | `src/lib/utils/error.ts` | `handleError()` | Server/Client 모두 |
| **상수** | `src/shared/lib/utils/constants.ts` | `src/lib/utils/constants.ts` | `ACTION_STATUS_CONFIG`, `CATEGORY_LABELS`, `CATEGORY_ORDER` | Server/Client 모두 |
| **차트 유틸** | `src/shared/lib/chart-utils.ts` | `src/lib/utils/chart-utils.ts` | `renderCumulativeChart()`, `renderWeeklyMixedChart()` | Client Only |

#### 11.2.2 Custom Hook으로 변환 필요 (React Lifecycle 필요)

| 훅 이름 | 현재 구현 | TO-BE 경로 | 변환 내용 | 우선순위 |
|--------|----------|-----------|----------|---------|
| **useToast** | `showToast()` | `src/hooks/use-toast.ts` | Context + `useState`로 토스트 상태 관리, `show()`, `hide()`, `showSuccess()`, `showError()` 메서드 제공 | 🔴 HIGH |
| **useModal** | 모달 상태 관리 (여러 곳) | `src/hooks/use-modal.ts` | `useState`로 열림/닫힘 상태, `open()`, `close()`, `toggle()` 메서드, Portal 렌더링 | 🔴 HIGH |
| **useDebounce** | 검색 입력 등 | `src/hooks/use-debounce.ts` | `useState` + `useEffect` + `setTimeout`, 입력 디바운싱 | 🟡 MEDIUM |
| **useLocalStorage** | 설정 저장 | `src/hooks/use-local-storage.ts` | `useState` + `useEffect`, localStorage 동기화, SSR 안전 처리 | 🟡 MEDIUM |
| **useOutsideClick** | Dropdown, Modal | `src/hooks/use-outside-click.ts` | `useEffect` + `ref`, 외부 클릭 감지, cleanup | 🔴 HIGH |
| **useSupabase** | Supabase 클라이언트 접근 | `src/hooks/use-supabase.ts` | `createClientComponentClient()` 래퍼, 타입 안전성 | 🔴 HIGH |
| **useManagers** | 담당자 목록 조회 | `src/hooks/use-managers.ts` | React Query `useQuery`, 담당자 목록 캐싱 | 🔴 HIGH |
| **useGoals** | 목표 CRUD | `src/hooks/use-goals.ts` | React Query `useQuery` + `useMutation`, 낙관적 업데이트 | 🔴 HIGH |
| **useReports** | 리포트 데이터 조회 | `src/hooks/use-reports.ts` | React Query `useQuery`, 필터 파라미터, 캐싱 | 🔴 HIGH |
| **useChart** | Chart.js 초기화 | `src/hooks/use-chart.ts` | `useRef` + `useEffect`, Chart 인스턴스 생성/cleanup, resize 처리 | 🔴 HIGH |
| **useDatePicker** | 날짜 선택 상태 | `src/hooks/use-date-picker.ts` | `useState` (selectedDate, currentMonth), 달력 네비게이션 로직 | 🟡 MEDIUM |
| **useTable** | 테이블 정렬/페이지네이션 | `src/hooks/use-table.ts` | `useState` (sortBy, sortOrder, page, pageSize), 정렬/페이지 로직 | 🟡 MEDIUM |
| **useIntersectionObserver** | 무한 스크롤, Lazy Load | `src/hooks/use-intersection-observer.ts` | IntersectionObserver API, `useEffect`, ref 기반 | 🟢 LOW |

#### 11.2.3 제거 대상 (Next.js/React로 대체)

| 현재 구현 | 위치 | 대체 방법 | 사유 |
|----------|------|----------|------|
| **DOM 캐시** | `src/shared/lib/cache.ts` (domElements) | React 자동 관리 | React가 Virtual DOM으로 관리, `useRef` 사용 |
| **Event Bus** | `src/shared/lib/event-bus.ts` | Props / Context / Zustand | React의 단방향 데이터 흐름, Props/Context로 충분 |
| **Request Manager** | `src/shared/lib/request-manager.ts` | React Query | React Query가 중복 요청 방지, 캐싱, 재시도 자동 처리 |
| **데이터 캐시** | `src/shared/lib/cache.ts` (데이터 부분) | React Query | React Query의 자동 캐싱, TTL, 재검증 |
| **라우터** | `src/features/navigation/` | Next.js App Router | 파일 시스템 기반 라우팅, 자동 코드 스플리팅 |

### 11.3 공용 컴포넌트 설계 원칙

#### 11.3.1 컴포넌트 설계 패턴

**1. Compound Component Pattern (복합 컴포넌트 패턴)**

```tsx
// 예시: Modal 컴포넌트
<Modal open={isOpen} onClose={handleClose}>
  <Modal.Header>
    <Modal.Title>목표 등록</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {/* 폼 내용 */}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleClose}>취소</Button>
    <Button variant="primary" onClick={handleSubmit}>저장</Button>
  </Modal.Footer>
</Modal>
```

**장점**: 유연성, 가독성, 컴포넌트 구조 명확화

**2. Render Props Pattern (선택적)**

```tsx
// 예시: Table 컴포넌트
<Table
  data={reports}
  columns={[
    { key: 'date', label: '날짜', render: (row) => formatDate(row.date) },
    { key: 'revenue', label: '매출', render: (row) => formatNumberWithCommas(row.revenue) },
  ]}
  onSort={handleSort}
/>
```

**3. Controlled vs Uncontrolled**

- **Controlled**: 상태를 부모에서 관리 (복잡한 폼, 외부 동기화 필요)
- **Uncontrolled**: 컴포넌트 내부에서 관리 (단순 UI, 독립적 동작)

#### 11.3.2 Props 설계 가이드

| 항목 | 권장 사항 | 예시 |
|------|----------|------|
| **필수 Props** | 최소화 | `<Button>Click</Button>` (children만 필수) |
| **선택적 Props** | 기본값 제공 | `variant="primary"`, `size="md"` |
| **이벤트 핸들러** | `on` 접두사 | `onClick`, `onChange`, `onClose` |
| **Boolean Props** | `is`, `has` 접두사 | `isLoading`, `hasError`, `disabled` |
| **CSS 클래스** | `className` prop 추가 지원 | 외부 스타일 오버라이드 가능 |
| **타입 안전성** | Props 인터페이스 명시 | `interface ButtonProps { ... }` |

#### 11.3.3 스타일링 전략

**옵션 1: CSS Modules (권장)**
```tsx
// Button.module.css
.button { ... }
.button--primary { ... }

// Button.tsx
import styles from './Button.module.css';
<button className={styles.button}>
```

**옵션 2: Tailwind CSS**
```tsx
<button className="px-4 py-2 bg-blue-500 text-white rounded">
```

**옵션 3: Plain CSS (현재 유지)**
```tsx
// Button.css
.Button { ... }

// Button.tsx
import './Button.css';
<button className="Button Button--primary">
```

**선택 기준**:
- 현재 프로젝트가 Plain CSS 사용 중 → 점진적 마이그레이션 가능
- CSS Modules 권장 (스코프 격리, 타입 안전성)
- Tailwind는 새 프로젝트에 적합 (러닝 커브, 설정 필요)

### 11.4 공용 유틸리티 설계 원칙

#### 11.4.1 순수 함수 (Pure Functions)

**원칙**:
- Side Effect 없음 (입력 → 출력만)
- 같은 입력 → 항상 같은 출력
- Server/Client 모두 사용 가능

**예시**:
```typescript
// ✅ GOOD - 순수 함수
export function formatDate(date: Date, format: string): string {
  // 입력을 변경하지 않음, 새로운 값 반환
  return ...;
}

// ❌ BAD - Side Effect
export function updateGlobalState(value: number): void {
  globalState.count = value; // 외부 상태 변경
}
```

#### 11.4.2 Custom Hooks

**원칙**:
- `use` 접두사 필수
- React 생명주기 활용 (useState, useEffect 등)
- 재사용 가능한 로직 캡슐화
- Client Component에서만 사용

**예시**:
```typescript
// ✅ GOOD - Custom Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

#### 11.4.3 에러 처리

**원칙**:
- 모든 비동기 함수는 try-catch 또는 Error Boundary
- 사용자 친화적 에러 메시지
- 개발 환경에서 상세 로그

**예시**:
```typescript
export async function fetchGoals() {
  try {
    const { data, error } = await supabase.from('goals').select('*');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    throw new Error('목표 데이터를 불러오는데 실패했습니다.');
  }
}
```

### 11.5 마이그레이션 우선순위 매트릭스

| 우선순위 | 컴포넌트/유틸리티 | 사유 |
|---------|------------------|------|
| **🔴 CRITICAL** | Button, Input, Modal, Toast, Table, useToast, useModal, useSupabase, useGoals, useChart | 모든 Feature에서 사용, 의존성 높음 |
| **🟡 HIGH** | Select, DatePicker, Tabs, ChartWrapper, useManagers, useReports, useOutsideClick, useDebounce | 여러 Feature에서 사용, 기능 구현에 필수 |
| **🟢 MEDIUM** | Card, Dropdown, Spinner, StatusCard, KpiCard, useLocalStorage, useTable, useDatePicker | Feature별로 필요, 우선순위 조정 가능 |
| **⚪ LOW** | Badge, Divider, useIntersectionObserver | 선택적 기능, 나중에 추가 가능 |

### 11.6 중복 코드 제거 기회

현재 코드베이스에서 **중복으로 구현**되어 있어 공용 컴포넌트로 통합할 수 있는 사례:

| 중복 코드 | 발견 위치 | 통합 방안 |
|----------|----------|----------|
| **버튼 생성** | `render()` 함수 내 `<button>` 태그 반복 | `<Button>` 컴포넌트로 통일 |
| **로딩 스피너** | `<div class="loading">Loading...</div>` 반복 | `<Spinner>` 컴포넌트 + Suspense |
| **모달 구조** | GoalRegisterModal, DataUpdateModal, OutboundModal 등 | `<Modal>` 공통 컴포넌트 + 내용만 다르게 |
| **담당자 선택** | `loadManagerList()` 여러 곳에서 호출 | `<ManagerSelect>` 컴포넌트 + `useManagers()` 훅 |
| **날짜 포맷팅** | `formatDate()` 비슷한 로직 여러 곳 | 단일 유틸 함수로 통일 |
| **에러 토스트** | `showToast()` 여러 곳에서 반복 호출 | `useToast()` 훅 + 전역 Provider |
| **차트 초기화** | Chart.js 초기화 로직 반복 | `useChart()` 훅 또는 `<ChartWrapper>` |

### 11.7 외부 라이브러리 고려사항

복잡한 UI 컴포넌트는 검증된 외부 라이브러리 사용 고려:

| 컴포넌트 | 자체 구현 | 외부 라이브러리 | 권장 |
|---------|----------|----------------|------|
| **DatePicker** | 현재 자체 구현 | react-datepicker, react-day-picker | 외부 라이브러리 권장 (유지보수, 접근성) |
| **Table** | 현재 자체 구현 | @tanstack/react-table | 복잡한 기능(정렬, 필터, 페이징) 필요 시 외부 권장 |
| **Modal** | 자체 구현 가능 | Radix UI, Headless UI | 접근성(ARIA) 중요 시 외부 권장 |
| **Dropdown** | 자체 구현 가능 | Radix UI, Headless UI | 키보드 네비게이션, 포커스 관리 필요 시 외부 권장 |
| **Toast** | 자체 구현 가능 | react-hot-toast, sonner | 간단한 경우 자체 구현, 복잡하면 외부 |
| **Chart** | Chart.js (계속 사용) | recharts, visx | Chart.js 유지 (이미 구현됨, React 래퍼만 추가) |
| **Button, Input** | 자체 구현 권장 | - | 디자인 시스템에 맞게 커스터마이징 필요 |

**선택 기준**:
- 자체 구현: 디자인 완전 제어, 번들 사이즈 최소화
- 외부 라이브러리: 접근성, 복잡한 상호작용, 유지보수 부담 감소

---

**다음 단계**: 이 공용 컴포넌트/유틸리티 분석을 바탕으로 우선순위별 구현 가이드 및 코드 예시를 작성합니다.

---
description: Next.js App Router 레이아웃; app/, components/ui(Shadcn), lib/api(데이터만), lib/utils; 필수 구조
globs: "app/**/*", "components/**/*", "lib/**/*", "types/**/*"
---

# 맵: 프로젝트 구조 (Next.js)

**이 규칙은 필수이다.** 아래 구조는 **예시일 뿐**이며, 의도한 레이아웃과 규칙을 보여주는 것이지 전체 파일 목록이 아니다. 코드를 추가하거나 옮길 때 여기서 설명하는 **구조 원칙**을 **반드시** 따라야 한다. 별도의 최상위 폴더를 만들거나 기능 코드와 공통 코드를 섞지 않는다.

## 1. 예시 레이아웃 (참고용 — 구조와 원칙을 따르고, 이름은 정확히 같을 필요 없음)

```
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈
│   ├── globals.css               # 전역 스타일 (Tailwind 진입)
│   ├── (dashboard)/              # 라우트 그룹
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── _components/      # 이 라우트 전용 UI
│   ├── (management)/
│   ├── api/                      # 필요 시 라우트 핸들러
│   └── ...
│
├── components/
│   ├── ui/                       # Shadcn/ui 전용 (npx shadcn@latest add로 추가)
│   ├── common/                   # 공유 UI: Toast, Skeleton 등
│   └── modals/                   # 여러 기능에서 쓰는 모달
│
├── lib/                          # 공유 인프라 및 로직
│   ├── supabase/                 # Supabase 클라이언트 (server, client, middleware)
│   ├── api/                      # 순수 API·데이터만 (Supabase 호출, fetch)
│   ├── utils/                    # 순수·무상태 헬퍼; 배럴로만 임포트
│   ├── logic/                    # (선택) 공유 비즈니스 로직
│   └── utils.ts                  # utils 배럴 re-export
│
├── types/                        # 전역 타입 정의
│   └── app-db.types.ts          # 앱에서 쓰는 DB 테이블·뷰 (Supabase 생성 타입 재내보내기)
│
└── public/                       # 정적 에셋
```

## 2. 필수 구조 규칙

### 2.1 라우트 전용 vs 공통

- **공통(공유):** **두 개 이상의 라우트·페이지**에서 쓰는 것은 `components/`(라우트 전용 `_components/` 제외), `lib/`, `types/`에 둔다. 데이터 계층은 `lib/api/`, 공유 로직은 `lib/` 또는 `lib/logic/`, 공유 UI는 `components/common/` 또는 `components/modals/`에 둔다.
- **라우트/기능 전용:** **한 라우트·기능**에만 속하는 코드는 **반드시** `app/` 아래 해당 라우트 폴더에 둔다. 예: UI는 `app/(dashboard)/dashboard/_components/`, 필요 시 해당 라우트 옆에 작은 `lib/` 또는 인라인 헬퍼. **금지:** 라우트 전용 화면·위젯을 `components/`에 두지 않는다. `app/.../_components/`에 둔다.

### 2.2 lib/api/ — 순수 데이터 통신만

- **lib/api/**에는 **API 호출·데이터 통신**만 둔다 (Supabase 호출, fetch, 요청/응답 처리 등). 오케스트레이션, 집계, 도메인 규칙은 여기 두지 않는다.
- **공유 비즈니스 로직**은 **lib/** 또는 **lib/logic/**에 둔다. 컴포넌트와 페이지는 데이터는 `lib/api/`를, 그 로직은 `lib/` 또는 `lib/logic/`을 호출한다.

### 2.3 components/는 공통만

- **components/ui/**는 **Shadcn/ui 전용**이다. `npx shadcn@latest add <component>`로 추가한다. 외부에서 복사해 붙여넣지 않는다.
- **components/common/**과 **components/modals/**는 **앱 전역에서 재사용하는 UI**용 (Toast, Skeleton, 모달). **라우트 전용 화면은 여기 두지 않는다.** 그런 것은 `app/<route>/_components/`에 둔다.

### 2.4 UI vs 로직

- 컴포넌트 파일 안에 **API 호출이나 복잡한 비즈니스 로직을 두지 않는다.** 데이터는 **lib/api/**, 공유 로직은 **lib/** 또는 **lib/logic/**을 사용한다. 컴포넌트는 **호출**하고 **렌더**만 한다. Server Component는 `page.tsx` 또는 `lib/`의 서버 헬퍼에서 fetch할 수 있다.

### 2.5 컴포넌트 및 스타일 규칙

- **컴포넌트당 파일 하나**를 우선한다 (예: `KpiCard.tsx`). 파일이 여러 개일 때만 **폴더**를 쓴다 (예: `KpiCard/KpiCard.tsx`, `KpiCard/index.ts`). **index.ts**는 진입점만: re-export; 비즈니스 로직을 두지 않는다.
- **스타일:** **Tailwind CSS**와 **Shadcn/ui** 클래스를 사용한다. 필요한 경우가 아니면 컴포넌트 전용 전역 CSS를 추가하지 않는다. 전역 스타일은 `app/globals.css`에만 둔다.

### 2.6 전역 스타일

- **app/globals.css**가 전역 스타일 진입점이다 (Tailwind 지시자, 테마용 디자인 토큰 등). 컴포넌트 수준 스타일은 Tailwind 클래스나 Shadcn variant로 처리한다. 프로젝트에서 이미 쓰는 경우가 아니면 새 전역 유틸 파일을 추가하지 않는다.

### 2.7 models/ vs types/

- **models/** (예: 라우트·기능 아래): **비즈니스 로직이 있는 클래스나 복잡한 상태 객체**용 (메서드, 검증). 단순 데이터 형태용이 아니다.
- **types/** (프로젝트 루트 `types/` 또는 기능 옆): **순수 TypeScript 인터페이스·타입 정의만** — 런타임 로직 없음. 공통 타입은 **types/**에, 라우트 전용 타입은 라우트 옆에 둘 수 있다 (예: `app/(dashboard)/dashboard/types.ts`).
- **앱 DB 타입:** 앱에서 실제로 사용하는 테이블·뷰의 `Database` 및 Row/Insert/Update 타입은 **types/app-db.types.ts**에서 재내보낸다 (Supabase 생성 스키마는 `database.types.ts`에 둘 수 있음). Supabase 응답·페이로드 타입은 `app-db.types.ts`의 타입을 사용한다.

### 2.8 이미지 및 에셋

- **전역 에셋:** **public/**에 로고, 파비콘, 공통 아이콘, 정적 파일을 둔다. 루트 기준으로 참조 (예: `/logo.svg`).
- **컴포넌트/기능 전용 에셋:** **해당 컴포넌트와 같은 폴더**에 두거나, 그 컴포넌트/라우트의 `assets/` 하위 폴더에 둔다.

### 2.9 utils 임포트 (배럴만)

- **lib/utils/** 아래 **공유 유틸**은 **utils 배럴**로만 임포트한다 (예: `from '@/lib/utils'` 또는 프로젝트 alias). `lib/utils/logger` 같은 하위 경로로 임포트하지 **않는다**.
- 이렇게 하면 임포트 경로가 일관되고 리팩터가 쉬워진다.

### 2.10 기능/라우트 간 통신 (디커플링)

- **라우트 간 임포트 지양:** 한 라우트의 `_components`나 로직을 다른 라우트에서 임포트하지 않는다. 라우트는 독립적으로 유지한다.
- **라우트 간 통신:** **이벤트**, **URL/searchParams**, 또는 **공유 상태**(예: React context, `stores/`의 Zustand 스토어)를 사용한다. 다른 라우트의 모듈에 직접 접근해 상태를 읽거나 바꾸지 않는다.

## 3. 최상위 폴더

| 폴더 | 역할 |
|------|------|
| **app/** | Next.js App Router: layout.tsx, page.tsx, globals.css; 라우트 그룹 및 라우트 전용 `_components/`. |
| **components/ui/** | Shadcn/ui 전용; `npx shadcn@latest add`로 추가. |
| **components/** | 앱 전역에서 재사용하는 공통 UI (common/, modals/). |
| **lib/api/** | **순수 API·데이터만** (Supabase, fetch). 비즈니스 로직 없음. |
| **lib/** | Supabase 클라이언트 (lib/supabase/), **공유 비즈니스 로직**, **lib/utils/** (배럴만). |
| **lib/logic/** | (선택) lib/와 분리한 공유 비즈니스 로직. |
| **types/** | **순수** TypeScript 인터페이스·타입. 앱 DB 타입 → **types/app-db.types.ts**. §2.7 참조. |
| **public/** | 정적 에셋 (파비콘, 이미지 등). |

## 4. 규칙 요약 (필수)

| 규칙 | 할 일 |
|------|--------|
| **라우트 vs 공통** | 라우트 전용 코드 → `app/<route>/_components/` (및 로컬 lib/types). 공통 → `components/`, `lib/`, `types/`. |
| **lib/api/ 데이터만** | lib/api/에는 API·데이터만. 공유 비즈니스 로직 → lib/ 또는 lib/logic/. |
| **components/ 공통만** | components/에는 앱 전역 재사용 UI만 (ui = Shadcn; common, modals). 라우트 전용 UI는 여기 두지 않는다. |
| **UI vs 로직** | 컴포넌트 파일에 API·비즈니스 로직 두지 않음. 데이터는 lib/api/, 공유 로직은 lib/; 컴포넌트는 호출·렌더만. |
| **스타일** | Tailwind + Shadcn. 전역 스타일은 app/globals.css. |
| **models/ vs types/** | models/ = 비즈니스 로직이 있는 클래스; types/ = 순수 인터페이스. 앱 DB 타입 = types/app-db.types.ts. |
| **에셋** | 전역 → public/. 컴포넌트/기능 전용 → 컴포넌트와 같은 폴더 또는 assets/ 하위 폴더. |
| **utils 임포트** | **lib/utils 배럴**만 사용 (예: @/lib/utils). 하위 경로로 임포트하지 않는다. |
| **라우트 간 통신** | 라우트 간 임포트 지양. 이벤트, URL/상태, 또는 stores/의 Zustand 스토어만 사용. |

## 체크리스트

- [ ] 이 코드가 한 라우트 전용인가? → `app/<route>/_components/` 또는 라우트 옆.
- [ ] 이 UI가 앱 전역에서 재사용되는가? → `components/common/` 또는 `components/modals/`. Shadcn → CLI로 `components/ui/`.
- [ ] 새 API/데이터 계층 → `lib/api/`만. 새 공유 로직 → `lib/` 또는 `lib/logic/`. 컴포넌트는 호출·렌더만?
- [ ] 새 순수 헬퍼 → `lib/utils/` (배럴)?
- [ ] 공통 타입 → `types/`. DB 테이블·뷰 타입 → `types/app-db.types.ts`?
- [ ] 스타일은 Tailwind/Shadcn; 전역은 app/globals.css만?
- [ ] 공유 유틸은 배럴(@/lib/utils 또는 프로젝트 alias)로만 임포트하는가?
- [ ] 라우트 간 통신은 이벤트 또는 공유 스토어만 사용하는가? (다른 라우트 내부를 임포트하지 않음)

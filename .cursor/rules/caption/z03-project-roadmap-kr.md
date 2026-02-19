---
description: 마이그레이션 로드맵 — 환경, 레이아웃/사이드바, 리포트 UI, 공용 lib/utils, 데이터 연결
alwaysApply: true
---

# 프로젝트 마이그레이션 로드맵

이 로드맵은 바닐라 TypeScript 앱을 Next.js로 이식할 때 **작업 순서**를 안내한다. **`02-project-migration.mdc`**와 맞춰 두었으며, 각 단계 구현 시 `docs/MIGRATION_ANALYSIS.md`와 `reference/` 소스를 사용한다.

## Phase 0 — 기초 프로젝트 환경

- 이후 마이그레이션이 진행될 수 있도록 **기반**을 세우고 검증한다.
- 적용 가능한 **프로젝트 스킬**(Next.js App Router, Vercel/React 모범 사례, 프론트엔드 디자인 등)을 활용한다.
- 다음을 확보한다:
  - Next.js(App Router), React, Tailwind, Shadcn/ui, Supabase 클라이언트가 올바르게 설정되어 있다.
  - 환경 변수, Supabase URL/키, 로컬 실행(`npm run dev` 등)이 동작한다.
  - TypeScript, ESLint, 프로젝트 구조가 `00-project-main.mdc`, `01-project-structure-rule.mdc`와 일치한다.

**완료 기준:** 앱이 로컬에서 실행되고, 빌드가 깨끗하며, 레이아웃·페이지 작업을 진행할 준비가 되어 있다.

---

## Phase 1 — 사이드바와 레이아웃

- **사이드바**와 **레이아웃** 파일을 만들어 모든 페이지가 공통 껍데기를 쓰도록 한다.
- 참고: `docs/MIGRATION_ANALYSIS.md`(라우팅, 네비게이션), `reference/`(예: `reference/ts-ads/src/shared/ui/common/Sidebar/`, navigation feature).
- 결과물:
  - 사이드바를 포함하는 루트 또는 대시보드 레이아웃.
  - 사이드바 컴포넌트(네비 항목, 활성 상태, 대시보드·리포트·주간 목표·월간 목표·설정 등 메인 섹션 링크).
  - 라우트 그룹 및 메인 페이지용 플레이스홀더로, 네비게이션이 동작하도록 한다.

**완료 기준:** 사이드바로 이동 시 해당 라우트와 기본 레이아웃이 보이고, 아직 각 기능의 본문은 없어도 된다.

---

## Phase 2 — Report 섹션 외형

- **Report 섹션 UI**를 구현한다(보이는 구조만, 실제 데이터는 아직 아님).
- 참고: `docs/MIGRATION_ANALYSIS.md`(Reports feature), `reference/ts-ads/src/features/reports/`.
- 결과물:
  - App Router 기준 리포트 페이지(일별/주별 또는 탭·필터가 있는 단일 리포트 뷰).
  - 외곽 구조: 기간 등 필터, 테이블/차트 플레이스홀더, 레퍼런스에 있는 컨트롤.
  - Tailwind·Shadcn/ui 사용; 컴포넌트는 목업·빈 데이터로 구성해도 된다.

**완료 기준:** Report 섹션의 레이아웃과 컨트롤이 레퍼런스와 비슷하게 보이고 동작하며, 데이터는 정적/목업이다.

---

## Phase 3 — 공용 라이브러리와 유틸

- 여러 기능에서 쓰는 **공용 라이브러리·유틸**을 만든다.
- 참고: `docs/MIGRATION_ANALYSIS.md`(shared 모듈, 데이터 흐름), `reference/ts-ads/src/shared/`(lib, api, utils, types).
- 결과물:
  - **lib/utils/**(또는 동일 역할)와 배럴 익스포트; 필요 시 날짜·포맷·검증 헬퍼.
  - **lib/api/** 스텁 또는 모듈(리포트/대시보드 데이터 접근용, 시그니처는 레퍼런스와 맞춤).
  - **types/**(또는 app-db.types)에 공용 타입; 레퍼런스·Supabase 스키마와 맞춤.
  - 리포트 등 여러 기능에서 재사용하는 로직은 **lib/** 또는 **lib/logic/**에 배치.

**완료 기준:** 공용 헬퍼와 API/데이터 레이어 형태가 자리 잡고 import 가능하며, 모든 엔드포인트를 다 구현할 필요는 없다.

---

## Phase 4 — 데이터 연결

- **실제 데이터**(Supabase 등)와 앱을 **연결**한다.
- 참고: `docs/MIGRATION_ANALYSIS.md`(데이터 흐름, API, 캐시), `reference/`(shared/api, 각 feature의 load/fetch 로직).
- 결과물:
  - 리포트 및 필요 시 대시보드·설정용 **lib/api/**(및 Supabase 클라이언트 사용) 구현.
  - 적절한 부분은 Server Components·서버 사이드 데이터 페칭; 필요한 곳만 Client Components·Zustand.
  - Report 섹션(및 범위에 포함된 다른 섹션)이 Supabase에서 읽어 실제 데이터를 표시.
  - `client_id`는 문자열, 날짜/영업일 규칙은 `31-term-main.mdc` 등 프로젝트 룰 준수.

**완료 기준:** Report(및 우선 적용한 다른 섹션)가 실제 데이터를 불러와 표시하며, 동작이 레퍼런스의 의미와 맞다.

---

## 워크플로

- **작업 시작 전:** 이 로드맵과 `02-project-migration.mdc`를 확인하고, 현재 Phase를 파악한다.
- **Phase(또는 그 안의 단계) 완료 후:** 진행 상황을 표시(planning 또는 이 파일의 체크리스트)하고 다음 단계로 넘어간다.
- **애매할 때:** 뒤 단계보다 앞 단계를 먼저 끝내는 쪽으로 진행한다(0 → 1 → 2 → 3 → 4).

## 체크리스트 (Phase)

- [ ] Phase 0 — 기초 프로젝트 환경
- [ ] Phase 1 — 사이드바와 레이아웃
- [ ] Phase 2 — Report 섹션 외형
- [ ] Phase 3 — 공용 라이브러리와 유틸
- [ ] Phase 4 — 데이터 연결

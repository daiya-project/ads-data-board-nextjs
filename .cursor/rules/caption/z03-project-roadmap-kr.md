---
description: 마이그레이션 로드맵 — 환경, 레이아웃/사이드바, 리포트 UI, 공용 lib/utils, 데이터 연결
alwaysApply: true
---

# 프로젝트 마이그레이션 로드맵

이 로드맵은 **마이그레이션 단계만** 나열한다. 상세 작업, AS-IS/TO-BE 경로, 체크리스트는 **`_docs/MIGRATION_ANALYSIS.md`**(9.6절, 10절, 11절)에 있다. 각 단계 구현 시 **`02-project-migration.mdc`**와 **`_reference/`** 소스를 사용한다.

## Phase 0 — 기초 프로젝트 환경

- Next.js(App Router), React, Tailwind, Shadcn/ui, Supabase 클라이언트 설정.
- 환경 변수, 로컬 실행(`npm run dev`), 빌드 성공.
- TypeScript, ESLint, 구조가 `00-project-main.mdc`, `01-project-structure-rule.mdc`와 일치.

**완료 기준:** 앱이 로컬에서 실행되고 빌드가 깨끗하며, 레이아웃·페이지 작업 준비가 되어 있다.

---

## Phase 1 — 공용 모듈 (Foundation)

### 1.1 공용 타입·유틸
### 1.2 공용 API 레이어
### 1.3 캐시/요청 전략 (예: React Query)
### 1.4 전역 CSS 이식 (토큰, base, layout)

**완료 기준:** 타입, `lib/utils/`, `lib/api/` 형태, 전역 스타일이 자리 잡고 import 가능하다.

---

## Phase 2 — 레이아웃과 네비게이션

### 2.1 AppShell → Root Layout
### 2.2 Sidebar → React 컴포넌트
### 2.3 커스텀 네비게이션 제거 (Next.js App Router)
### 2.4 중첩 라우트·레이아웃 (리포트, 설정 등)
### 2.5 라우트 플레이스홀더·페이지 껍데기

**완료 기준:** 사이드바와 레이아웃이 동작하고, 네비게이션으로 올바른 라우트가 보이며, 아직 기능 본문은 없어도 된다.

---

## Phase 3 — 기능(Feature) 마이그레이션

### 3.1 Dashboard
### 3.2 Reports
#### 3.2.1 데일리 리포트
#### 3.2.2 위클리 리포트
### 3.3 Goal Weekly
### 3.4 Goal Monthly
### 3.5 Settings
#### 3.5.1 목표 설정
#### 3.5.2 담당자 설정

**완료 기준:** 각 기능의 UI·구조가 레퍼런스와 맞고, 데이터는 우선 정적/목업이어도 된다.

---

## Phase 4 — 공용 UI 컴포넌트

### 4.1 Toast / ToastProvider
### 4.2 Dropdown
### 4.3 DatePicker
### 4.4 Tabs
### 4.5 Table
### 4.6 Modal (예: DataUpdateModal)

**완료 기준:** 기능에서 쓰는 공용 UI가 `components/ui/`(또는 동일 역할)에 준비되어 있다.

---

## Phase 5 — 데이터 연결

- 리포트, 대시보드, 목표, 설정을 실제 데이터(Supabase)와 연결.
- `lib/api/`(및 훅) 구현으로 라이브 데이터 사용; Server/Client 분리, 필요 시 Zustand.
- `client_id`는 문자열, 날짜/영업일 규칙은 `31-term-main.mdc` 준수.

**완료 기준:** Report(및 우선 적용한 다른 섹션)가 실제 데이터를 불러와 표시하며, 동작이 레퍼런스와 맞다.

---

## 워크플로

- **시작 전:** 이 로드맵과 `02-project-migration.mdc`를 확인하고, 현재 Phase/단계를 파악한다.
- **단계 완료 후:** 진행을 표시(이 파일의 체크리스트 또는 planning)하고 다음 단계로 진행한다.
- **애매할 때:** 뒤 단계보다 앞 단계를 먼저 완료한다(0 → 1 → 2 → 3 → 4 → 5).

## 체크리스트 (Phase)

- [x] Phase 0 — 기초 프로젝트 환경
- [ ] Phase 1 — 공용 모듈 (Foundation)
- [ ] Phase 2 — 레이아웃과 네비게이션
- [ ] Phase 3 — 기능(Feature) 마이그레이션
- [ ] Phase 4 — 공용 UI 컴포넌트
- [ ] Phase 5 — 데이터 연결

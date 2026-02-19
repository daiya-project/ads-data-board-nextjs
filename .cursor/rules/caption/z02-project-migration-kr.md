---
description: 마이그레이션 목표 — _docs/MIGRATION_ANALYSIS.md 및 _reference 소스로 바닐라 TS를 Next.js로 이식
alwaysApply: true
---

# 프로젝트 마이그레이션 맥락

## 목표

이 프로젝트는 **기존 바닐라 TypeScript 애플리케이션을 Next.js로 고품질 이식**하는 것을 목표로 한다. 마이그레이션은 처음부터 다시 쓰는 것이 아니라, 기존 동작·구조·비즈니스 로직을 Next.js App Router 및 React 패턴에 맞게 재사용·적응시키는 것이다.

## 필수 참조 자료

### 1. 마이그레이션 분석 문서

- **경로:** `_docs/MIGRATION_ANALYSIS.md`
- **용도:** 마이그레이션 작업(새 페이지, 기능, 상태, 데이터 흐름)을 설계하거나 구현하기 **전에** 이 문서를 참고한다. 문서에는 다음이 정리되어 있다:
  - 현재 아키텍처(Feature-Sliced Design, features, shared 모듈).
  - 상태 관리(Feature 로컬 상태, window 전역, 이벤트 버스, 캐시).
  - 라우팅 및 화면 전환.
  - 데이터 흐름 및 API 사용.
  - 바닐라 패턴을 Next.js/React(Server/Client Components, Zustand, lib/api 등)로 매핑하는 방법.

분석 문서를 활용해 원본 앱의 동작과 도메인 경계를 유지하고, 이와 충돌하는 새로운 패턴을 임의로 도입하지 않는다.

### 2. 레퍼런스 소스 코드

- **경로:** `_reference/` (예: `_reference/ts-ads/src/`)
- **용도:** reference 폴더에는 **원본 바닐라 TypeScript 소스**가 있다. 기능·화면을 이식할 때:
  - **해당 reference 코드**(동일 Feature 또는 shared 모듈)를 읽어 비즈니스 로직, 검증, 데이터 형태를 보존한다.
  - 그 로직을 **재사용·적응**하여 Next.js 구조에 맞춘다: 데이터는 `lib/api/`, 비즈니스 로직은 `lib/` 또는 `lib/logic/`, UI는 React 컴포넌트, 필요 시 Zustand로 클라이언트 상태.
  - 무조건 복사하지 말고, 명령형/DOM 기반 코드를 React(컴포넌트, 훅, Server/Client 분리)로 변환하며 프로젝트 룰(예: `00-project-main.mdc`, `01-project-structure-rule.mdc`, `20-code-main.mdc`)을 따른다.

## DB 스키마 (Supabase / Postgres)

- **이 프로젝트의 스키마:** 새 테이블·뷰는 **`ads`** 스키마에 둔다.
- **`public` 스키마:** 마이그레이션 이전 앱에서 사용하던 스키마이다. `public`에 있는 테이블은 **레거시 또는 레퍼런스**이며, 이번 프로젝트에서는 `ads`(및 필요 시 `shared`)에 새 테이블을 만든다. `public` 스키마를 바라보는 코드는 레거시이거나 레퍼런스 전용으로 본다.
- **사용 스키마:** 이 프로젝트에서는 **`ads`**와 **`shared`** 스키마만 사용한다. 새 마이그레이션과 애플리케이션 코드는 `ads.*`, `shared.*`만 참조하고 `public.*`는 참조하지 않는다.

## 원칙

- **동작 동등성:** 이식된 화면·기능은 원본의 동작과 데이터 의미를 유지한다; 분석 문서와 reference 코드로 검증한다.
- **구조 정렬:** 원본 Feature·shared 모듈을 마이그레이션 분석 및 프로젝트 구조 룰에 따라 Next.js 구조(App Router, `_components/`, `lib/api/`, `lib/`, `types/`, `stores/`)에 매핑한다.
- **불필요한 이탈 금지:** 분석 문서나 프로젝트 룰에 없는 새 아키텍처·라이브러리를 도입하지 않고, reference 코드를 합의된 스택(Next.js, React, Tailwind, Shadcn, Zustand, Supabase)에 맞게 적응하는 것을 우선한다.

## 체크리스트

- [ ] 이식 대상 영역에 대해 `_docs/MIGRATION_ANALYSIS.md`를 확인했는가?
- [ ] 구현 시 동일 Feature/모듈의 `_reference/` 소스를 참고했는가?
- [ ] 바닐라 패턴을 그대로 복사하지 않고 Next.js/React 패턴(Server/Client, lib/api, 컴포넌트)으로 적응했는가?
- [ ] 원본 앱의 동작·데이터 의미를 유지했는가?

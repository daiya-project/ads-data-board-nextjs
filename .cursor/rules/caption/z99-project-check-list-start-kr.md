---
description: 프로젝트 초기 셋업 체크리스트 — 개발 시작 전 확인 사항
alwaysApply: false
---

# 프로젝트 초기 셋업 체크리스트

**목적:** 새 프로젝트를 부트스트랩하거나 레포를 클론했을 때 한 번 수행하는 체크리스트. 개발을 시작하기 전에 각 항목을 확인한다. 사용자가 명시적으로 요청하지 않는 한 파일 내용을 **읽지 않는다** — 존재 여부만 확인할 것.

## 1. 패키지 매니저 & 스크립트

- [ ] 프로젝트 루트에 `package.json` 존재
- [ ] `"dev"` 스크립트 정의됨 (예: `"dev": "next dev"`)
- [ ] `"build"` 스크립트 정의됨 (예: `"build": "next build"`)
- [ ] `"update-types"` (또는 동등한) 스크립트 정의됨 — Supabase에서 `database.types.ts` 다운로드. **이 프로젝트의 Supabase 프로젝트 ID:** `lmftwznuhgphousfojpb` (예: `"update-types": "npx supabase gen types typescript --project-id lmftwznuhgphousfojpb > types/database.types.ts"`)
- [ ] 핵심 의존성 설치됨: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `tailwindcss` (및 Shadcn 사용 시 해당 패키지)

## 2. TypeScript 설정

- [ ] 프로젝트 루트에 `tsconfig.json` 존재
- [ ] `"strict": true` 설정됨
- [ ] 프로젝트에서 경로 별칭을 사용하는 경우 설정됨 (예: Next.js의 `"@/*": ["./*"]`)

## 3. 환경 변수

- [ ] `.env` (또는 `.env.local`) 파일에 Supabase 자격 증명 포함:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `.env`가 `.gitignore`에 포함됨

## 4. Supabase 타입 파일

- [ ] `types/database.types.ts` 존재 (Supabase 생성 전체 스키마)
- [ ] `types/app-db.types.ts` 존재 (앱에서 실제 사용하는 테이블/뷰의 앱 레벨 재수출)
- [ ] 클론 후 `npm run update-types` (또는 동등한 명령)를 최소 한 번 실행하여 `database.types.ts` 생성 완료

## 5. 프로젝트 구조 (Next.js)

- [ ] `app/` — App Router: `layout.tsx`, `page.tsx`, `globals.css`
- [ ] `app/api/` — 필요 시 라우트 핸들러
- [ ] `components/ui/` — Shadcn/ui 컴포넌트 (`npx shadcn@latest add`로 추가)
- [ ] `components/common/` 또는 `components/modals/` — 공유 재사용 UI
- [ ] `lib/api/` — API·데이터 통신 레이어만
- [ ] `lib/supabase/` 또는 `lib/` — Supabase 클라이언트, 공유 로직
- [ ] `lib/utils/` — 공유 유틸리티 (배럴 임포트)
- [ ] `types/` — 전역 타입 정의, `app-db.types.ts`
- [ ] `public/` — 정적 에셋

## 6. 스타일링

- [ ] `app/globals.css` 존재 (전역 CSS 진입점, Tailwind v4 `@import "tailwindcss"`, `@theme` 블록, CSS 변수)
- [ ] **`tailwind.config.ts`나 `tailwind.config.js`가 없음** — Tailwind CSS v4는 CSS-first 설정 방식으로, `app/globals.css`에서 전부 설정
- [ ] `postcss.config.mjs` 존재 — `@tailwindcss/postcss` 플러그인 포함
- [ ] 컴포넌트 수준 스타일은 Tailwind/Shadcn 사용; 필요한 경우가 아니면 컴포넌트 전용 전역 CSS 없음

## 7. Next.js 진입

- [ ] `app/layout.tsx` 존재 (루트 레이아웃)
- [ ] `app/page.tsx` 존재 (홈 또는 루트 페이지)

## 8. 버전 관리

- [ ] `.gitignore`에 포함: `node_modules/`, `.next/`, `out/`, `.env`, `.env.local`
- [ ] 최초 커밋 완료

## 9. Cursor 규칙

- [ ] `.cursor/rules/` 폴더에 프로젝트 룰 파일(`.mdc`)이 존재
- [ ] `.cursor/rules/caption/` 폴더에 한국어 캡션 파일이 존재
- [ ] *(`_cursor-rules` 공용 규칙을 사용하는 경우)*: `package.json` scripts에 `"rules:sync"` 스크립트가 정의됨. 프로젝트 로컬 규칙만 사용하는 경우 생략 가능.

### 공용 규칙(심볼릭 링크)

공용 규칙은 **심볼릭 링크**를 통해 `_cursor-rules`(예: `dev/_cursor-rules`)와 연결해 사용한다. `package.json`의 `rules:sync` 스크립트가 이 링크를 만들어 `.cursor/rules/` 및 `.cursor/rules/caption/`이 공용 규칙 파일을 가리키게 한다.

**터미널 명령어** (프로젝트 루트에서 실행; 아래 경로에 `_cursor-rules`가 있어야 함, 예: `dev/_cursor-rules`):

```bash
mkdir -p .cursor/rules/caption
cd .cursor/rules
ln -sf ../../../_cursor-rules/*.mdc .
cd caption
ln -sf ../../../../_cursor-rules/caption/*.md .
```

**package.json 스크립트** (`scripts`에 추가):

```json
"rules:sync": "cd .cursor/rules && ln -sf ../../../_cursor-rules/*.mdc . && cd caption && ln -sf ../../../../_cursor-rules/caption/*.md ."
```

- **새 공용 규칙 추가:** 규칙 파일은 프로젝트의 `.cursor/rules/`가 아니라 **`_cursor-rules`** 레포에서 생성·수정한다. 그 다음 프로젝트에서 `npm run rules:sync`를 실행해 새 파일 또는 수정된 파일이 링크되도록 한다.
- **심볼릭 링크된 파일:** 프로젝트 폴더에서 심볼릭 링크된 파일을 수정하면 `_cursor-rules`의 동일한 파일(링크 대상)이 수정된다. 변경 사항은 해당 링크를 쓰는 모든 프로젝트에 공유된다.
- **심볼릭 링크가 아닌 파일:** `.cursor/rules/` 안에서 **심볼릭 링크가 아닌** 파일(예: 프로젝트 전용 규칙)은 `_cursor-rules`와 무관하다. `rules:sync`로 덮어쓰이지 않으며, 공용 규칙 집합에도 영향을 주지 않는다.

## 사용 방법

1. 새 프로젝트를 셋업하거나 레포지토리를 처음 클론할 때 이 체크리스트를 연다.
2. 각 섹션을 순회하며 해당 항목이 존재하거나 설정되어 있는지 확인한다.
3. **파일 내용을 읽지 않는다** — 사용자가 명시적으로 파일 리뷰를 요청하지 않는 한 존재 여부만 확인.
4. 항목을 완료 표시한다. 누락된 항목이 있으면 개발 진행 전에 생성 또는 설정한다.

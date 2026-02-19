---
description: docs/products/ 컴포넌트 문서; Covered files 목록; 해당 파일 수정 시 문서 갱신.
globs: ["components/**/*.tsx", "app/**/_components/**/*.tsx", "hooks/**/*.ts", "docs/products/*.md"]
---

# 컴포넌트 문서화 규칙

AI 세션과 개발자가 제품의 **비즈니스 로직**과 **상태 흐름**을 이해할 수 있도록, 논리·상태를 다루는 **기능 컴포넌트**나 **훅**을 만들 때마다 문서를 작성한다. 각 문서에는 **Covered files**를 두고, 그 목록에 있는 파일을 수정하면 해당 문서를 반드시 갱신한다.

## 1. 문서 위치 및 명명

- **대상 폴더:** `docs/products/`
- **파일명:** `[컴포넌트-kebab-case].md` (예: `KpiTable.tsx` → `kpi-table.md`)

## 2. 작성·갱신 조건

- **작성:** 비즈니스 로직, 상태 관리, 복잡한 상호작용, Server Action/API 호출, 2곳 이상 재사용이 있을 때 문서를 작성한다. **Covered files**를 포함한다.
- **갱신(로직 변경):** 기존 컴포넌트/훅을 리팩터링하거나 로직을 크게 바꾸면 문서가 없으면 만들고, 있으면 갱신한다.
- **갱신(Covered files 수정 시):** **문서의 Covered files에 있는 파일을 수정한 경우** 해당 문서를 **반드시** 갱신한다.
  - **Last updated**를 현재 일시(YYYY-MM-DD HH:mm:ss)로 수정한다.
  - **Revision history**에 해당 일시와 변경 내용 요약 한 줄을 추가한다.
  - 동작·상태가 바뀌었으면 본문(Overview, Props, State, Core Logic, AI Guide, State → Action 표)을 수정한다.

## 3. 문서 템플릿 (Markdown)

문서는 아래 구조를 **반드시** 따른다.

```markdown
# [컴포넌트 이름]

## Document info
- **Created:** YYYY-MM-DD HH:mm:ss
- **Last updated:** YYYY-MM-DD HH:mm:ss

## Revision history
| Date | Description |
|------|-------------|
| YYYY-MM-DD HH:mm:ss | Initial version. |

## Covered files
이 문서가 다루는 파일. **아래 파일 중 하나를 수정하면 이 문서를 갱신한다.**

| Path | Role |
|------|------|
| `@/path/to/Component.tsx` | (예: 루트 컴포넌트) |
| `@/hooks/useX.ts` | (예: 접기 상태) |

## 1. Overview
## 2. Key Props & State
## 3. Core Logic & Interactions
## 4. AI Implementation Guide (State → Action 표, Modification rules, Dependencies)
(조건 해당 시 Section 5–6: Edge Cases, Accessibility)
```

## 4. 체크리스트

- [ ] 논리·상태가 있는 새 컴포넌트/훅 → `docs/products/[이름-kebab-case].md` 작성 시 **Covered files** 포함?
- [ ] 문서에 Document info, Revision history, Covered files, Overview, Props & State, Core Logic, AI Guide(State → Action 표) 포함?
- [ ] **Covered files에 있는 파일을 수정한 뒤** → 해당 문서 갱신(Last updated, Revision history, 본문)?
- [ ] 로직 변경·리팩터링 시 → 해당 문서 갱신?

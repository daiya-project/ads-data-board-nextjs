---
description: .cursor/rules/*.mdc 파일 생성·수정 시 따를 규칙
globs: .cursor/rules/*.mdc
alwaysApply: false
---

# 규칙 작성 규칙

`.cursor/rules/` 내 파일을 만들거나 수정할 때 아래 규칙을 따른다.

## 필수: 캡션 동기화 (`.cursor/rules/caption/`)

**이 규칙은 필수이며 예외가 없다.**

**규칙 파일과 캡션 파일은 두 언어로 된 동일한 파일이다.** 구조가 같다: 동일한 frontmatter 키, 동일한 제목, 동일한 섹션. 차이는 언어뿐이다—규칙(`.mdc`)은 영어, 캡션은 한국어. 생략·의역 없음.

**캡션 파일 이름:** 검색 시 캡션 파일이 규칙 파일보다 뒤에 오도록 **`z` 접두사**를 쓴다 (예: `00-project-main.mdc` → `caption/z00-project-main-kr.md`). 규칙 파일과 캡션을 구분하기 쉽게 한다.

- **규칙 파일을 새로 만들 때**: `.cursor/rules/` 루트의 새 `.mdc`마다 `.cursor/rules/caption/z<basename>-kr.md`에 캡션을 **반드시** 만든다 (예: `00-project-main.mdc` → `caption/z00-project-main-kr.md`). 캡션에는 다음이 포함되어야 한다:
  - **규칙과 동일한 frontmatter**: `description`(값은 한국어), 그리고 `alwaysApply` 또는 `globs`(규칙과 동일한 키·값). 코드·패턴 값(예: `globs: "**/*.ts"`)은 그대로 두고, `description` 같은 자연어 필드만 번역한다.
  - **규칙과 동일한 본문**을 한국어로 번역—동일한 제목, 동일한 순서, 동일한 코드 블록(코드 내 주석은 필요 시 번역 가능).
- **규칙 파일을 수정할 때**: `.cursor/rules/caption/z<basename>-kr.md`에 있는 해당 캡션을 **반드시** 수정해 한국어로 된 동일한 파일을 유지한다: 동일한 frontmatter 구조와 동일한 내용, 한국어.

캡션이 없으면 만든다. 있으면 수정한다. 이 단계를 건너뛰지 않는다.

## 파일 이름

규칙 파일 이름은 **2자리 숫자**, **접두사**, 그 다음 **소문자+하이픈(kebab-case)** 로 쓴다: `NN-<prefix>-<suffix>.mdc` (예: `00-project-main.mdc`).

| 스타일 | 예시 | 권장 |
|--------|------|------|
| 2자리 + 접두사 + 하이픈 | `00-project-main.mdc`, `09-project-authoring-rule.mdc` | **예** |
| 단어 첫 글자 대문자 | `Project-Main.mdc` | 아니오 |
| 숫자 없음/잘못된 접두사 | `project-main.mdc`, `map-styles.mdc` | 아니오 |

이유:
- **순서**: 2자리 접두사로 00, 01, …처럼 안정적·읽기 쉬운 순서 유지.
- **대소문자 구분 없는 파일시스템**(macOS, Windows): 소문자로 혼동 방지.
- **명확함**: 규칙 파일 하나의 이름 규칙으로 통일.

**규칙 파일은 아래 구조와 허용 접두사 중 하나를 써야 한다.** 그 외 패턴(예: `typescript-standards.mdc`)은 허용하지 않는다.

| 접두사 | 용도 | 예시 |
|--------|------|------|
| **`project`** | 프로젝트 전역 규칙, 기준, 메타(규칙 작성 등) | `00-project-main.mdc`, `09-project-authoring-rule.mdc` |
| **`code`** | 코드 표준, 구조(TS, HTML, 컴포넌트, 패턴) | `20-code-main.mdc` |
| **`term`** | 용어 정의, 용어집, 명명 어휘 | `31-term-main.mdc`, `31-term-date.mdc` |
| **`data`** | 데이터 로직: 타입, 상태, 조회, 변환, 검증 | `40-data-main-rule.mdc` |
| **`css`** | CSS, 스타일, 레이아웃 규칙 | `50-css-main.mdc` |

파일명은 **`NN-<prefix>-<suffix>.mdc`** 형태로: 2자리 숫자 + 위 다섯 접두사 중 하나 + kebab-case 접미사.

### term 규칙: 인덱스 + 도메인 파일

**`term`** 규칙은 도메인별로 나누고 인덱스 파일을 두는 것을 권장한다:

- **`NN-term-main.mdc`** (예: `31-term-main.mdc`): 인덱스만. 용어와 해당 용어를 정의하는 파일만 나열. `alwaysApply: true`로 설정해 AI가 항상 이 맵을 갖도록. 여기서는 전체 정의 없음.
- **`NN-term-<domain>.mdc`** (예: `31-term-date.mdc`): 실제 정의. 관련 코드 편집 시 해당 파일이 로드되도록 `globs` 설정. 정의는 해당 파일의 `globs`(또는 `alwaysApply`)가 맞을 때 적용된다.

## 파일 형식

- **확장자**: `.mdc`만.
- **위치**: `.cursor/rules/`만. Cursor는 하위 폴더의 규칙을 로드하지 않으므로 모든 규칙 파일을 `.cursor/rules/` 루트에 둔다.
- **Frontmatter**: 상단 `---` 사이의 YAML. 필수 필드:
  - `description`: 짧은 요약(규칙 선택기에 표시).
  - `alwaysApply: true` 또는 `globs: <pattern>` (예: `**/*.ts`) 중 하나. 같은 규칙에 둘을 충돌하도록 두지 않는다.

## 이름과 역할

- 모든 규칙 파일은 `NN-<prefix>-<suffix>.mdc` 패턴과 다섯 접두사 중 하나를 써야 한다: `project`, `code`, `term`, `data`, `css` (위 표 참조).
- 규칙이 적용될 파일에 맞게 `globs`(또는 `alwaysApply`)를 설정한다. 예: `*-code-*.mdc`는 흔히 `globs: **/*.{ts,tsx,html}` 사용.

## 사용자가 규칙에 추가를 요청할 때

사용자가 규칙 파일에 무언가를 추가해 달라고 요청한 경우:
- **큰따옴표로 감싼 텍스트** (`"..."`): **입력한 그대로** 추가한다. 번역하거나 바꾸지 않는다.
- **그 외 모든 텍스트**: 먼저 영어로 번역한 뒤 규칙에 추가한다.

## 본문

- **규칙 본문은 전부 영어**로 쓴다 (project-main 참조).
- 선택: `[KO]`로 줄 시작하거나 `<!-- KO: ... -->`로 한국어(또는 사람 전용) 메모를 넣을 수 있다. AI는 무시한다 (project-main 참조).
- 파일당 한 주제에 집중하고, 가능하면 약 50줄 이내로 유지한다.
- 코드나 목록으로 구체적인 예(좋은 예 vs 나쁜 예)를 두는 것을 권장한다.

## 새 규칙 체크리스트

- [ ] 파일이 `.cursor/rules/` 내 `.mdc`인가
- [ ] **캡션**: `caption/z<basename>-kr.md`를 **동일 구조**로 생성했는가 (description은 한국어, `globs`/`alwaysApply` 동일, 동일 섹션, 본문 한국어)
- [ ] 규칙 frontmatter에 `description`과 `alwaysApply` 또는 `globs`가 있는가
- [ ] 파일명이 `NN-<prefix>-<suffix>.mdc` 형태이고 접두사 중 하나를 쓰는가: `project`, `code`, `term`, `data`, `css` (2자리 숫자 + 접두사 + kebab-case 접미사)
- [ ] 규칙 본문이 영어인가

## 규칙 수정 시 체크리스트

- [ ] **캡션**: `caption/z<basename>-kr.md`를 수정해 한국어로 된 동일 파일을 유지했는가 (frontmatter + 본문)

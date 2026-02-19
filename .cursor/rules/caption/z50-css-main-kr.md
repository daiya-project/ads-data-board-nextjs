---
description: Tailwind CSS v4 (CSS-first, JS 설정 없음)·Shadcn/ui 스타일링; 전역은 app/globals.css; BEM·컴포넌트 스코프 CSS는 필요 시에만
globs: "**/*.css", "**/*.tsx"
---

# CSS 및 스타일링

- **Tailwind CSS v4 (CSS-first):** 이 프로젝트는 Tailwind CSS v4를 사용하며, CSS(`app/globals.css`)에서 `@import "tailwindcss"`로 전부 설정한다. **`tailwind.config.ts`나 `tailwind.config.js`가 없다.** 테마 커스터마이즈는 `app/globals.css`의 `@theme` 블록과 CSS 변수로 한다. 레이아웃, 간격, 타이포, 색상에 유틸리티 클래스를 사용한다. 커스텀 CSS보다 Tailwind를 우선한다.
- **Shadcn/ui:** `components/ui/`의 Shadcn 컴포넌트를 사용하고, Tailwind 클래스와 컴포넌트의 `className` 또는 variant props로 스타일을 준다. Shadcn용 새 전역 CSS를 추가하지 말고, `app/globals.css`에 정의된 프로젝트 기존 테마를 사용한다.
- **전역 스타일:** `app/globals.css`에만 둔다 (Tailwind `@import`, `@theme` 블록, 테마용 CSS 변수). 프로젝트에서 이미 쓰는 경우가 아니면 새 전역 스타일시트를 추가하지 않는다.
- **컴포넌트 수준:** JSX 안에서 Tailwind를 우선한다. 서드파티나 복잡한 애니메이션 등 필요한 경우가 아니면 컴포넌트 스코프 CSS 파일을 쓰지 않는다.

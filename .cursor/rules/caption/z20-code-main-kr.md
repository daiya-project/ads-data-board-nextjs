---
description: 핵심 규칙. React/Next.js 컴포넌트 아키텍처; Tailwind + Shadcn; 부수 효과 정리는 useEffect cleanup
alwaysApply: true
---

# 핵심 코딩 기준: React & Next.js 컴포넌트 아키텍처

**필수:** 모든 UI 개발은 React 및 Next.js 패턴을 따라야 한다. 프로젝트 스택만 사용한다. Next.js (App Router), React, Tailwind CSS, Shadcn/ui. 기술 스택은 `00-project-main.mdc`, 폴더 구조는 `01-project-structure-rule.mdc`를 참고한다.

## 1. 컴포넌트 전략 (React + JSX)

**❌ 엄격히 금지:**

- UI에 vanilla DOM API를 사용하지 않는다 (예: `insertAdjacentHTML`, `document.createElement`, `render()`/`getHTML()`이 있는 클래스 기반 컴포넌트).
- `index.html`에 UI 마크업을 넣거나 App Router 밖에 두지 않는다 (Next.js가 루트 문서를 관리한다).

**✅ 필수:**

- **React 함수 컴포넌트:** UI는 JSX를 반환하는 **함수 컴포넌트**로 구현한다. props와 state는 TypeScript로 타입을 지정한다.
- **파일당 하나의 컴포넌트** (예: `KpiCard.tsx`). 컴포넌트에 여러 파일이 필요하면 폴더를 사용한다 (예: `KpiCard/KpiCard.tsx`, `KpiCard/index.ts`). `index.ts`는 re-export만 한다.
- **Server vs Client:** 기본은 **Server Component**이다. 훅(`useState`, `useEffect`), 이벤트 핸들러, 브라우저 API가 필요할 때만 `"use client"`를 붙인다. 클라이언트 경계는 가능한 한 말단 컴포넌트로 한정한다.

```tsx
// ✅ 좋음 — TypeScript를 사용한 React 함수 컴포넌트
type KpiCardProps = {
  title: string;
  value: string | number;
};

export function KpiCard({ title, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}
```

```tsx
// ✅ 좋음 — 필요한 경우에만 Client 컴포넌트 (예: 상호작용)
"use client";

import { useState } from "react";

export function FilterButton() {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen(!open)}>
      Toggle
    </button>
  );
}
```

## 2. 스타일 전략 (Tailwind + Shadcn)

**✅ 필수:**

- **Tailwind CSS:** 레이아웃, 간격, 타이포, 색상에는 유틸리티 클래스를 사용한다. 가능하면 Tailwind를 사용하고 커스텀 CSS는 피한다.
- **Shadcn/ui:** `components/ui/`의 컴포넌트를 사용한다. Tailwind 클래스와 컴포넌트의 `className` 또는 variant props로 스타일을 지정한다. 새 Shadcn 컴포넌트는 `npx shadcn@latest add <component>`로 추가한다. 외부에서 복사해 붙여넣지 않는다.
- **전역 스타일:** `app/globals.css`에만 둔다 (Tailwind 지시자, 테마용 CSS 변수). 프로젝트에서 이미 쓰는 경우가 아니면 새 전역 스타일시트를 추가하지 않는다.
- **컴포넌트 수준:** JSX 안에서 Tailwind를 우선한다. 컴포넌트 전용 CSS 파일(예: `KpiCard.module.css`)은 꼭 필요할 때만 사용한다 (예: 서드파티, 복잡한 애니메이션).

**❌ 피할 것:**

- 레이아웃·시각 스타일용 BEM 또는 커스텀 클래스 명명 (대신 Tailwind 사용).
- Tailwind와 중복되는 전역 클래스명 (예: 전역 스타일시트의 `.card .value`, `.title`).

```tsx
// ✅ 좋음 — Tailwind + Shadcn 시맨틱
<div className="rounded-lg border bg-card p-4 shadow-sm">
  <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
  <span className="text-2xl font-semibold tabular-nums">{value}</span>
</div>
```

## 3. 데이터와 로직 (컴포넌트 내 API 금지)

**✅ 필수:**

- **데이터:** Server Component에서 가져온다 (async `page.tsx` 또는 `lib/`의 서버 헬퍼). 또는 `lib/api/`의 함수를 호출한다 (Supabase, fetch). Supabase 호출이나 fetch 로직을 컴포넌트 파일 안에 두지 않는다. 컴포넌트는 `lib/api/`를 **호출**하거나 props로 데이터를 **받아서** **렌더만** 한다.
- **비즈니스 로직:** `lib/` 또는 `lib/logic/`에 둔다. 컴포넌트는 이를 호출하고 결과만 렌더한다. 도메인 규칙이나 집계 로직을 UI 파일에 넣지 않는다.

## 4. 라이프사이클과 부수 효과 (useEffect cleanup)

**✅ 필수:**

- **클라이언트 전용 효과:** **Client Component**에서 이벤트 리스너, 구독, `setInterval`/`setTimeout` 등 리소스를 쓸 때는 `useEffect`를 사용한다. 리스너 제거 및 타이머/구독 해제를 수행하는 **cleanup 함수**를 반환한다.

```tsx
// ✅ 좋음 — useEffect에서 cleanup
"use client";

import { useEffect, useRef } from "react";

export function ResizeObserverBox({ onResize }: { onResize: (w: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      onResize(width);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [onResize]);

  return <div ref={ref} />;
}
```

```tsx
// ✅ 좋음 — 타이머 cleanup
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
}, []);
```

- **수동 `destroy()` 사용 금지:** 언마운트는 React가 처리한다. 클래스 스타일 `destroy()`를 구현하지 말고, `useEffect`의 cleanup 반환만 사용한다.

## 체크리스트

- [ ] UI가 React 함수 컴포넌트 + JSX로 구현되어 있는가? (vanilla DOM 또는 클래스 기반 render 없음)
- [ ] 스타일은 Tailwind와 Shadcn만 사용하는가? 전역 스타일은 `app/globals.css`에만 있는가?
- [ ] 기본은 Server Component이고, 훅이나 브라우저 API가 필요할 때만 `"use client"`를 쓰는가?
- [ ] 컴포넌트 파일 안에 API나 비즈니스 로직이 없는가? (데이터는 `lib/api/` 또는 props)
- [ ] 부수 효과·구독이 cleanup 함수를 반환하는 `useEffect`로 처리되는가?
- [ ] 파일당 하나의 컴포넌트(또는 index re-export가 있는 하나의 폴더)인가?

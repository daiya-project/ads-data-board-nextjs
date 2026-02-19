---
description: 아이콘·이모지 규칙; UI에는 lucide-react만 사용, OS 기본 텍스트 이모지 사용 금지.
alwaysApply: true
---

# 아이콘 및 이모지 (엄격 규칙)

## 1. 기본 규칙: UI에 OS 기본 텍스트 이모지 사용 금지

UI에서 **OS 기본 텍스트 이모지**(예: 💰, 📈, ⚠️, ✅)를 사용하지 않는다. 플랫폼(Windows / macOS / 모바일)마다 렌더링이 다르게 보인다.

## 2. 기본 아이콘 세트: lucide-react

UI 아이콘은 **항상 `lucide-react`**를 사용한다.

- **임포트:** `import { IconName } from "lucide-react"`
- **스타일:** 크기·색상은 Tailwind 클래스 사용 (예: `className="w-4 h-4 text-muted-foreground"`).

### 자주 쓰는 매핑 (이모지 대신 Lucide 사용)

| 사용 금지 (이모지) | 사용 (lucide-react)        |
|--------------------|----------------------------|
| 💰                 | `<DollarSign />`           |
| 📈                 | `<TrendingUp />`           |
| ⚠️                 | `<AlertCircle />`          |
| ✅                 | `<CheckCircle2 />`         |
| ❌                 | `<XCircle />` 또는 `<X />` |
| ℹ️                 | `<Info />`                 |

```tsx
// ✅ GOOD
import { DollarSign, TrendingUp } from "lucide-react";

<DollarSign className="w-4 h-4 text-muted-foreground" />
<TrendingUp className="w-5 h-5 text-green-600" />
```

```tsx
// ❌ BAD — UI에 기본 이모지 사용
<span>💰 Revenue</span>
```

## 3. 예외 (사용자가 명시적으로 요청한 경우에만)

다른 이모지/아이콘 에셋은 **사용자가 명시적으로 요청했을 때만** 사용한다.

- **Microsoft Fluent Emoji (3D):** 사용자가 "3D 이모지" 또는 "큐트한 분위기" 등을 요청한 경우, Next.js `Image`와 Fluent Emoji 에셋(CDN 또는 로컬) 사용.
- **Twemoji:** 사용자가 "Twemoji"를 명시적으로 요청한 경우에만, CDN 등으로 Twemoji 그래픽 사용.

사용자가 "3D", "Twemoji" 등을 **요청하지 않았다면** **기본은 `lucide-react`**로 한다.

## 체크리스트

- [ ] UI 코드에 OS 기본 텍스트 이모지(💰, 📈 등)가 없음?
- [ ] 아이콘은 `lucide-react`에서 임포트하고 Tailwind로 스타일 적용?
- [ ] Fluent·Twemoji 등 대체 이모지는 사용자가 명시적으로 요청한 경우에만 사용?

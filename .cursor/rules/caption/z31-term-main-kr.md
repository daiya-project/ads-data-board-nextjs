---
description: Supabase·PostgreSQL 사용 시 시간/날짜 용어 및 구현 규칙 (ads_data_daily, public_holidays). 오늘/현재 월은 시스템 날짜 사용.
alwaysApply: true
---

# 데이터: 시간과 날짜

`ads_data_daily`, `public_holidays` 같은 테이블을 쓰는 Supabase/PostgreSQL 환경에서의 시간/날짜 용어와 구현 규칙.

## 1. 용어 정의

| 용어 | 의미 | 구현 |
|------|------|------|
| **Date** | 테이블 `date` 컬럼 값 | 테이블의 `date` (또는 `revenue_date`) |
| **Today / most recent day** | 현재 달력상 오늘 | **시스템 날짜** 사용 (예: `new Date()`, `new Date().toISOString().slice(0, 10)`) |
| **Current month** | 현재 달력상 월 | **시스템 날짜**에서 유도 (YYYY-MM) |
| **Workday** | 휴일이 아닌 날 | `public_holidays`에 없음; 일별 데이터는 `is_holiday = false`로 필터 |

## 2. 오늘 / 현재 월

- **오늘:** **시스템 날짜**를 사용한다 (클라이언트 또는 서버의 현재 날짜).
- **현재 월:** 시스템 날짜의 월(YYYY-MM).

```typescript
// ✅ 좋음 — 오늘/현재 월에 시스템 날짜 사용
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const currentMonth = today.slice(0, 7); // YYYY-MM
```

## 3. 근무일(Workdays)

- **일별 데이터:** `is_holiday = false`(또는 동일 조건)로 필터.
- **특정 날짜가 근무일인지:** `public_holidays`에 **없으면** 근무일로 본다.

```typescript
// ✅ 근무일만
const { data } = await supabase
  .from("ads_data_daily")
  .select("*")
  .gte("date", startDate)
  .lte("date", endDate)
  .eq("is_holiday", false)
  .order("date", { ascending: true });

// ✅ 근무일인가?
const { data } = await supabase
  .from("public_holidays")
  .select("date")
  .eq("date", targetDate)
  .maybeSingle();
const isWorkday = data == null;
```

## 4. 날짜 형식 (CSV / API)

- **내부 / API:** `YYYY-MM-DD` 권장.
- **CSV / 사용자 입력:** 여러 형식을 받을 수 있다면, DB나 비즈니스 로직에 넣기 전에 **YYYY-MM-DD로 정규화**한다.

## 5. 참조 테이블

| 테이블 | 역할 |
|--------|------|
| `ads_data_daily` | 일별 데이터; `date`, `is_holiday` 등. |
| `public_holidays` | 휴일 목록 — 근무일 판단에 사용 |

## 체크리스트

- [ ] 오늘/현재 월을 시스템 날짜로 사용하는가?
- [ ] 근무일 필터에 `is_holiday` 또는 `public_holidays`를 쓰는가?
- [ ] CSV/입력 날짜를 사용 전 YYYY-MM-DD로 정규화하는가?

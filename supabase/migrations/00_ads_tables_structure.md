# 광고 데이터 테이블 구조 (ads_data_*)

광고팀 일별 데이터, 클라이언트, 아웃바운드, 목표(goal) 관련 **public** 스키마 테이블 구조 설명 문서입니다.  
타입 정의 기준: `reference/ts-ads/src/shared/types/database.types.ts` (Supabase 자동 생성 타입).

---

## 1. ads_data_daily

**용도:** 일별 광고 데이터. 클라이언트·날짜 단위 매출·노출·클릭·전환 등.

| 컬럼 | 타입 | NULL | 설명 |
|------|------|------|------|
| `id` | string | N (PK) | 행 식별자 (기본값 있음) |
| `date` | string | N | 날짜 (YYYY-MM-DD) |
| `client_id` | string | N | 클라이언트 ID → `ads_data_client.client_id` |
| `client_name` | string | Y | 클라이언트명 (스냅샷) |
| `manager_id` | number | Y | 담당 매니저 ID → `shared_manager.id` |
| `amount` | number | N | 매출(금액) |
| `vimp` | number | Y | 노출 수 |
| `click` | number | Y | 클릭 수 |
| `conversion` | number | Y | 전환 수 |
| `is_holiday` | boolean | Y | 공휴일 여부 |
| `created_at` | string | Y | 생성 시각 |
| `updated_at` | string | Y | 수정 시각 |

**관계:** `manager_id` → `shared_manager.id`

---

## 2. ads_data_client

**용도:** 광고 클라이언트(광고주) 마스터. 담당 매니저, 아웃바운드 여부 등.

| 컬럼 | 타입 | NULL | 설명 |
|------|------|------|------|
| `client_id` | string | N (PK) | 클라이언트 ID (문자열, 선행 0 유지) |
| `client_name` | string | N | 클라이언트명 |
| `manager_id` | number | Y | 담당 매니저 ID → `shared_manager.id` |
| `second_manager_id` | number | Y | 부 담당 매니저 ID → `shared_manager.id` |
| `outbound` | boolean | N | 아웃바운드 여부 |
| `created_at` | string | Y | 생성 시각 |
| `updated_at` | string | Y | 수정 시각 |

**관계:**
- `manager_id` → `shared_manager.id`
- `second_manager_id` → `shared_manager.id`

---

## 3. ads_data_goal

**용도:** 매니저별 목표(주간/월간 등). 목표 매출, 기간, 카테고리, 메모.

| 컬럼 | 타입 | NULL | 설명 |
|------|------|------|------|
| `id` | string | N (PK) | 목표 식별자 (기본값 있음) |
| `manager_id` | number | Y | 담당 매니저 ID → `shared_manager.id` |
| `start_date` | string | N | 시작일 (YYYY-MM-DD) |
| `end_date` | string | Y | 종료일 (YYYY-MM-DD) |
| `period_type` | string | Y | 기간 유형 (예: 주간/월간) |
| `goal_category` | string | Y | 목표 카테고리 |
| `goal_revenue` | number | N | 목표 매출 |
| `start_revenue` | number | Y | 기간 시작 시점 매출(기준값) |
| `activate` | boolean | N | 활성 여부 |
| `memo` | string | Y | 메모 |
| `created_at` | string | Y | 생성 시각 |
| `updated_at` | string | Y | 수정 시각 |

**관계:** `manager_id` → `shared_manager.id`

---

## 4. ads_data_client_outbound

**용도:** 클라이언트별 아웃바운드 기간. 해당 기간 동안 아웃바운드로 간주.

| 컬럼 | 타입 | NULL | 설명 |
|------|------|------|------|
| `id` | number | N (PK) | 행 식별자 (자동 증가) |
| `client_id` | string | N | 클라이언트 ID (FK 없음이지만 `ads_data_client.client_id`와 연관) |
| `outbound_start` | string | N | 아웃바운드 시작일 |
| `outbound_end` | string | N | 아웃바운드 종료일 |
| `created_at` | string | Y | 생성 시각 |

**관계:** (테이블 수준 FK 없음. 앱에서 `ads_data_client`와 논리적 연결)

---

## 5. ads_data_goal_actionitem

**용도:** 목표(goal)별 액션 아이템. 할 일, 완료 메모, 상태.

| 컬럼 | 타입 | NULL | 설명 |
|------|------|------|------|
| `id` | number | N (PK) | 행 식별자 (자동 증가) |
| `goal_id` | string | N | 목표 ID → `ads_data_goal.id` |
| `action_item` | string | N | 액션 아이템 내용 |
| `status` | string | Y | 상태 (예: 완료/미완료) |
| `done_memo` | string | Y | 완료 메모 |
| `created_at` | string | Y | 생성 시각 |
| `updated_at` | string | Y | 수정 시각 |

**관계:** `goal_id` → `ads_data_goal.id`

---

## 6. ads_data_goal_targetclient

**용도:** 목표(goal)에 연결된 타깃 클라이언트 목록. N:N 관계 테이블.

| 컬럼 | 타입 | NULL | 설명 |
|------|------|------|------|
| `id` | number | N (PK) | 행 식별자 (자동 증가) |
| `goal_id` | string | N | 목표 ID → `ads_data_goal.id` |
| `client_id` | string | N | 클라이언트 ID → `ads_data_client.client_id` |
| `created_at` | string | Y | 생성 시각 |
| `updated_at` | string | Y | 수정 시각 |

**관계:**
- `goal_id` → `ads_data_goal.id`
- `client_id` → `ads_data_client.client_id`

---

## 관계 요약

```
shared_manager (id)
    ↑
    ├── ads_data_daily.manager_id
    ├── ads_data_client.manager_id, second_manager_id
    └── ads_data_goal.manager_id

ads_data_client (client_id)
    ↑
    ├── ads_data_daily.client_id (논리적)
    ├── ads_data_client_outbound.client_id (논리적)
    └── ads_data_goal_targetclient.client_id

ads_data_goal (id)
    ↑
    ├── ads_data_goal_actionitem.goal_id
    └── ads_data_goal_targetclient.goal_id
```

---

## 참고

- **날짜:** 내부/API는 `YYYY-MM-DD` 문자열 사용. 휴일·영업일은 `ads_data_daily.is_holiday` 또는 `public_holidays` 참고.
- **client_id:** 프로젝트 규칙상 **문자열만** 사용 (숫자 변환 금지, 선행 0 유지).
- **ads 스키마:** `20260219_create_ads_schema.sql`로 `ads` 스키마 생성, `20260220_copy_ads_data_daily_to_ads.sql`로 `ads.ads_data_daily`에 public 데이터 복사.

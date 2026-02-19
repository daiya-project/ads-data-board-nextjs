# DataUpdateModal

## Document info

- **Created:** 2026-02-19 12:00:00
- **Last updated:** 2026-02-19 (UpsertMode·upsertStart/End 반영)

## Revision history

| Date       | Description                    |
|-----------|--------------------------------|
| 2026-02-19 12:00:00 | 초안 작성 (구현 사후 문서화). |
| 2026-02-19 | Option A 반영: 모달+CSV를 `DataUpdateModal/` 폴더로 통합, CSV 실제 연동 완료, Covered files·경로·의존성 수정. |
| 2026-02-19 | isForceMode/forceStart/forceEnd → UpsertMode('append'\|'replace'), upsertStart, upsertEnd로 변경. latestDate는 DB 최신 집계일(getLatestDateFromDb) 유지. |

## Covered files

이 문서가 다루는 파일. **아래 파일을 수정할 때는 반드시 이 문서를 갱신한다** (Last updated, Revision history, 동작/상태 변경 시 본문 수정).

| Path | Role |
|------|------|
| `@/components/modals/DataUpdateModal/DataUpdateModal.tsx` | 모달 UI (Client Component) |
| `@/components/modals/DataUpdateModal/index.ts` | 모달 re-export |
| `@/components/modals/DataUpdateModal/constants.ts` | CSV URL·ProgressCallback 타입 |
| `@/components/modals/DataUpdateModal/csv-parser.ts` | parseCSV, CSVRecord |
| `@/lib/utils/date-utils.ts` | normalizeDate (barrel: `@/lib/utils`) |
| `@/components/modals/DataUpdateModal/csv-mapper.ts` | buildUpsertPayload (CSV → ads.daily/client) |
| `@/components/modals/DataUpdateModal/csv-uploader.ts` | updateDataFromCSV, forceUpdateDataFromCSV |
| `@/stores/data-update-modal-store.ts` | 모달 열림 상태 (Zustand) |
| `@/lib/api/daily.ts` | 최신 날짜 조회 (ads.daily) |
| `@/lib/api/csv-update.ts` | CSV API re-export (모달 폴더 csv-uploader·constants) |
| `@/lib/utils/string-utils.ts` | cleanClientName (barrel: `@/lib/utils`) |

## 1. Overview

- **Path:** `components/modals/DataUpdateModal/` (폴더 단위. Option A: 모달 + CSV 상수·파서·매퍼·업로더 한 덩어리)
- **Purpose:** 사용자가 Google Sheets CSV를 DB(ads.daily, ads.client)에 동기화할 수 있는 모달. Redash 링크 안내, “현재 ~까지 집계” 표시, 일반 Import / 강제 업데이트(기간 지정) 선택, 진행률 표시 및 완료/오류 처리. CSV 다운로드 → 파싱 → 매핑 → 광고주 동기화 → 일별 배치 삽입까지 실제 연동 완료.

## 2. Key Props & State

- **Props:** 없음. 열림 상태는 전역 스토어 `useDataUpdateModalStore`로 제어.
- **State (store):** `open`, `openModal()`, `closeModal()`.
- **State (로컬):**  
  - `latestDate`: DB 최신 집계일(YYYY-MM-DD 또는 null). **시스템 날짜가 아니라** `getLatestDateFromDb()`로 ads.daily에서 조회한 값. (함수 유지.)  
  - `upsertMode`: `'append'` | `'replace'`. append=최신일 이후만 추가, replace=지정 구간 삭제 후 재업로드.  
  - `upsertStart`, `upsertEnd`: replace 모드일 때 기간(YYYY-MM-DD). UI 라벨은 "시작일"/"종료일".  
  - `isImporting`: Import 진행 중 여부(버튼 비활성).  
  - `progressVisible`, `progressVariant`('idle'|'done'|'error'), `progressStage`, `progressPercent`, `progressDetail`: 진행 영역 표시용.

## 3. Core Logic & Interactions

- **모달 오픈 시:** `open`이 true가 되면 `useEffect`에서 진행·upsert 범위 초기화, `getLatestDateFromDb()` 호출 후 `latestDate` 설정.
- **CSV 버튼:** `CSV_SOURCE_URL`(모달 폴더 `constants.ts`) 새 탭 오픈.
- **Upsert 모드:** 토글 시 `upsertMode === 'replace'`이면 시작일/종료일(upsertStart, upsertEnd) 입력 표시; 'append'면 숨김. Import 버튼 라벨/스타일이 “강제 Import”로 변경.
- **Import 클릭:**  
  - `upsertMode === 'replace'`일 때: upsertStart·upsertEnd 필수, 시작 ≤ 종료 검사. 실패 시 진행 영역에 오류 표시.  
  - replace면 `forceUpdateDataFromCSV(upsertStart, upsertEnd, onProgress)`, append면 `updateDataFromCSV(onProgress)` 호출 (둘 다 `./csv-uploader`).  
  - 성공: 진행을 done으로 두고, `localStorage.setItem('data-update-toast', ...)` 후 800ms 뒤 `closeModal()` + `router.refresh()`.  
  - 실패: `progressVariant='error'`, `progressStage`/`progressDetail`에 메시지, `isImporting=false`.
- **닫기:** Dialog `onOpenChange(false)` 또는 헤더 X 버튼 → `closeModal()`.

## 4. AI Implementation Guide (For vibe coding)

### State → Action → Implementation (required)

| State / condition | Meaning | Use this function / API | Where to implement |
|-------------------|--------|--------------------------|--------------------|
| 모달 열림 | 사용자가 Update Data 클릭 | `useDataUpdateModalStore().openModal()` | AppSidebar 등 트리거 |
| 모달 닫힘 | 사용자가 닫기/오버레이 | `closeModal()` | DataUpdateModal 내부 |
| 최신 날짜 표시 | 모달 오픈 시 1회 (DB 기준) | `getLatestDateFromDb()` | DataUpdateModal useEffect (latestDate = DB 최신 집계일, 시스템 날짜 아님) |
| CSV 소스 열기 | CSV 버튼 클릭 | `window.open(CSV_SOURCE_URL)` | DataUpdateModal handleCsvClick (CSV_SOURCE_URL from `./constants`) |
| 일반 Import | upsertMode === 'append' + Import 클릭 | `updateDataFromCSV(onProgress)` | DataUpdateModal handleImportClick (`./csv-uploader`) |
| 강제 Import | upsertMode === 'replace' + upsertStart/End 입력 + Import 클릭 | `forceUpdateDataFromCSV(upsertStart, upsertEnd, onProgress)` | DataUpdateModal handleImportClick (`./csv-uploader`) |
| 진행률 표시 | API가 onProgress 호출 시 | setProgressStage/Percent/Detail, progressVisible=true | DataUpdateModal onProgress 콜백 |
| 성공 후 처리 | 업데이트 완료 | localStorage + closeModal + router.refresh() | DataUpdateModal handleImportClick try |
| 오류 표시 | API throw 시 | progressVariant='error', progressDetail=msg | DataUpdateModal handleImportClick catch |

- **Modification rules:**  
  - CSV 로직 수정: `components/modals/DataUpdateModal/` 내부 파일(csv-uploader, csv-mapper, csv-parser, constants)에서 수행. client_id는 문자열만 사용 (40-data-main-rule).  
  - 토스트 노출: 성공 시 `localStorage.setItem('data-update-toast', ...)` 사용 중이므로, 레이아웃 또는 토스트 프로바이더에서 해당 키를 읽어 표시하면 됨.  
  - CSV URL 오버라이드: `DataUpdateModal/constants.ts`에서 `NEXT_PUBLIC_CSV_SOURCE_URL`, `NEXT_PUBLIC_CSV_DOWNLOAD_URL` 환경 변수로 오버라이드 가능.  
  - 외부에서 CSV API만 쓸 때: `@/lib/api/csv-update`에서 re-export된 `updateDataFromCSV`, `forceUpdateDataFromCSV`, `CSV_SOURCE_URL`, `CSV_DOWNLOAD_URL` 사용.
- **Dependencies:** `@/components/ui/dialog`, `@/components/ui/button`, `@/lib/utils` (cn), `@/stores/data-update-modal-store`, `@/lib/api/daily`, `@/components/modals/DataUpdateModal/constants`, `@/components/modals/DataUpdateModal/csv-uploader`, `next/navigation` (useRouter). (모달은 폴더 내부 `./constants`, `./csv-uploader` 사용.)

/**
 * CSV uploader: download → parse → map → sync clients → insert daily.
 * Uses ads.daily, ads.client, ads.ref_holiday. client_id is string only.
 */

import { createClient } from "@/lib/supabase/client";
import { CSV_DOWNLOAD_URL } from "./constants";
import type { ProgressCallback } from "./constants";
import { parseCSV } from "./csv-parser";
import { buildUpsertPayload } from "./csv-mapper";
import { devLog } from "./devlog";

const BATCH_SIZE = 1000;
const PROGRESS_INSERT_START = 55;
const PROGRESS_INSERT_END = 95;

type SupabaseClient = ReturnType<typeof createClient>;

async function syncClients(
  supabase: SupabaseClient,
  newClientsToInsert: { client_id: string; client_name: string; manager_id: null }[],
  report: (stage: string, percent: number, detail?: string) => void,
): Promise<void> {
  if (newClientsToInsert.length === 0) return;

  const uniqueClients: { client_id: string; client_name: string; manager_id: null }[] = [];
  const seenIds = new Set<string>();
  for (const client of newClientsToInsert) {
    if (!seenIds.has(client.client_id)) {
      uniqueClients.push(client);
      seenIds.add(client.client_id);
    }
  }
  devLog(`처리할 광고주: ${uniqueClients.length}개`);

  const clientIdsToCheck = uniqueClients.map((c) => c.client_id);
  const existingInDbSet = new Set<string>();

  for (let i = 0; i < clientIdsToCheck.length; i += 500) {
    const chunk = clientIdsToCheck.slice(i, i + 500);
    const { data: existingInDb, error: checkError } = await supabase
      .schema("ads")
      .from("client")
      .select("client_id")
      .in("client_id", chunk)
      .limit(chunk.length + 10);

    if (checkError) {
      devLog(`기존 광고주 확인 오류: ${checkError.message}`);
    } else {
      for (const row of (existingInDb ?? []) as { client_id: string }[]) {
        existingInDbSet.add(row.client_id);
      }
    }
  }

  const reallyNewClients = uniqueClients.filter(
    (c) => !existingInDbSet.has(c.client_id),
  );
  const existingClients = uniqueClients.filter((c) =>
    existingInDbSet.has(c.client_id),
  );

  if (reallyNewClients.length > 0) {
    const { error: insertError } = await supabase
      .schema("ads")
      .from("client")
      .insert(
        reallyNewClients as unknown as Record<string, unknown>[],
      );

    if (insertError) {
      devLog(`새 광고주 추가 오류: ${insertError.message}`);
      for (const client of reallyNewClients) {
        const { error: singleError } = await supabase
          .schema("ads")
          .from("client")
          .insert([client as unknown as Record<string, unknown>]);
        if (singleError) {
          devLog(
            `광고주 ${client.client_id} 추가 실패: ${singleError.message}`,
          );
        }
      }
    } else {
      devLog(`새 광고주 ${reallyNewClients.length}개 추가 완료`);
    }
  }

  if (existingClients.length > 0) {
    for (const client of existingClients) {
      const { error: updateError } = await supabase
        .schema("ads")
        .from("client")
        .update({ client_name: client.client_name })
        .eq("client_id", client.client_id);
      if (updateError) {
        devLog(
          `광고주 ${client.client_id} 업데이트 실패: ${updateError.message}`,
        );
      }
    }
    devLog(`기존 광고주 ${existingClients.length}개 업데이트 완료`);
  }
}

async function insertDailyBatches(
  supabase: SupabaseClient,
  recordsToInsert: unknown[],
  report: (stage: string, percent: number, detail?: string) => void,
  options?: { useUpsert: boolean },
): Promise<void> {
  const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);
  const useUpsert = options?.useUpsert ?? false;

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batchIdx = Math.floor(i / BATCH_SIZE);
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    const batchProgress =
      PROGRESS_INSERT_START +
      ((batchIdx + 1) / totalBatches) *
        (PROGRESS_INSERT_END - PROGRESS_INSERT_START);

    report(
      "데이터 저장 중...",
      Math.round(batchProgress),
      `${Math.min(i + BATCH_SIZE, recordsToInsert.length).toLocaleString()} / ${recordsToInsert.length.toLocaleString()} 레코드`,
    );

    if (useUpsert) {
      const { error: upsertError } = await supabase
        .schema("ads")
        .from("daily")
        .upsert(batch as unknown as Record<string, unknown>[], {
          onConflict: "date,client_id",
        });

      if (upsertError) {
        throw new Error(
          `데이터 저장 오류 (배치 ${batchIdx + 1}): ${upsertError.message}`,
        );
      }
      devLog(`배치 ${batchIdx + 1}: ${batch.length}개 레코드 upsert 완료`);
    } else {
      const { error: insertError } = await supabase
        .schema("ads")
        .from("daily")
        .insert(batch as unknown as Record<string, unknown>[]);

      if (insertError) {
        throw new Error(
          `데이터 삽입 오류 (배치 ${batchIdx + 1}): ${insertError.message}`,
        );
      }
      devLog(`배치 ${batchIdx + 1}: ${batch.length}개 레코드 삽입 완료`);
    }
  }
}

async function fetchHolidays(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .schema("ads")
    .from("ref_holiday")
    .select("holiday_name");

  if (error) {
    throw new Error(`공휴일 데이터 조회 오류: ${error.message}`);
  }

  const holidays = new Set<string>();
  for (const row of (data ?? []) as { holiday_name: string | Date }[]) {
    const dateStr =
      row.holiday_name instanceof Date
        ? row.holiday_name.toISOString().split("T")[0]
        : String(row.holiday_name).split("T")[0];
    holidays.add(dateStr);
  }
  return holidays;
}

/**
 * CSV 데이터를 DB에 업데이트 (최신 날짜 이후만 삽입). 프로그레스 콜백 지원.
 */
export async function updateDataFromCSV(
  onProgress?: ProgressCallback,
): Promise<void> {
  const report = (stage: string, percent: number, detail?: string) => {
    onProgress?.({ stage, percent, detail });
  };

  report("CSV 데이터 다운로드 중...", 5);

  const supabase = createClient();

  const response = await fetch(CSV_DOWNLOAD_URL);
  if (!response.ok) {
    throw new Error("CSV 데이터를 가져올 수 없습니다.");
  }
  const csvText = await response.text();

  report("CSV 파싱 중...", 15);

  const records = parseCSV(csvText);
  const headers = csvText.split("\n")[0]?.split(",").map((h) => h.trim()) ?? [];
  devLog(`CSV 헤더:`, headers);
  devLog(`총 ${records.length}개의 레코드 파싱 완료`);

  report("기존 데이터 조회 중...", 20);

  const { data: lastDateData, error: lastDateError } = await supabase
    .schema("ads")
    .from("daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastDateError && (lastDateError as { code?: string }).code !== "PGRST116") {
    throw new Error(`마지막 날짜 조회 오류: ${(lastDateError as Error).message}`);
  }

  /** DB 최신일 YYYY-MM-DD. 없으면 null (전체 업로드 방지를 위해 append는 최신일 기준만 사용) */
  const lastDateStr =
    lastDateData != null
      ? String((lastDateData as { date: string }).date).split("T")[0]
      : null;

  report("광고주 데이터 조회 중...", 30);

  const { data: clientData, error: clientError } = await supabase
    .schema("ads")
    .from("client")
    .select("client_id, manager_id")
    .limit(SUPABASE_SELECT_MAX_ROWS);

  if (clientError) {
    throw new Error(`클라이언트 데이터 조회 오류: ${clientError.message}`);
  }

  const clientManagerMap: Record<string, number | null> = {};
  const existingClientIds = new Set<string>();
  for (const row of (clientData ?? []) as { client_id: string; manager_id: number | null }[]) {
    clientManagerMap[row.client_id] = row.manager_id;
    existingClientIds.add(row.client_id);
  }

  report("공휴일 조회 중...", 32);
  const holidays = await fetchHolidays(supabase);

  report("신규 레코드 분류 중...", 40);

  // append: 최신일 당일 포함(>=) — 동일 (date, client_id)는 upsert로 덮어씀
  const { recordsToInsert, newClientsToInsert } = buildUpsertPayload(
    records,
    {
      dateFilter: (dateStr) =>
        lastDateStr != null && dateStr >= lastDateStr,
      clientManagerMap,
      existingClientIds,
      holidays,
    },
  );

  if (recordsToInsert.length === 0) {
    const dateCol = headers.find((h) => /date|날짜/i.test(h)) ?? "(날짜 컬럼 없음)";
    devLog(
      `[진단] 업로드 대상 0건. DB 최신일(lastDateStr)=${lastDateStr ?? "null"} | CSV 날짜 컬럼=${dateCol} | 파싱된 행 수=${records.length}`,
    );
    report("새로운 데이터가 없습니다.", 100, "최신 상태");
    return;
  }

  report(
    "광고주 데이터 동기화 중...",
    50,
    `신규 레코드 ${recordsToInsert.length.toLocaleString()}개 발견`,
  );

  await syncClients(supabase, newClientsToInsert, report);

  await insertDailyBatches(supabase, recordsToInsert, report, {
    useUpsert: true,
  });

  report(
    "완료!",
    100,
    `${recordsToInsert.length.toLocaleString()}개 레코드 저장 완료`,
  );
}

/**
 * 강제 업데이트: 지정 날짜 범위의 데이터를 삭제 후 CSV에서 재업로드.
 */
export async function forceUpdateDataFromCSV(
  startDate: string,
  endDate: string,
  onProgress?: ProgressCallback,
): Promise<void> {
  const report = (stage: string, percent: number, detail?: string) => {
    onProgress?.({ stage, percent, detail });
  };

  report("CSV 데이터 다운로드 중...", 5);

  const supabase = createClient();

  const response = await fetch(CSV_DOWNLOAD_URL);
  if (!response.ok) {
    throw new Error("CSV 데이터를 가져올 수 없습니다.");
  }
  const csvText = await response.text();

  report("CSV 파싱 중...", 15);

  const records = parseCSV(csvText);
  devLog(`총 ${records.length}개의 레코드 파싱 완료`);

  report("기존 데이터 삭제 중...", 25, `${startDate} ~ ${endDate}`);

  const { error: deleteError } = await supabase
    .schema("ads")
    .from("daily")
    .delete()
    .gte("date", startDate)
    .lte("date", endDate);

  if (deleteError) {
    // 선택한 기간에 DB에 데이터가 없어 삭제할 행이 없을 수 있음 → 삭제는 스킵하고 해당 기간 CSV 데이터만 업로드
    devLog(`기존 데이터 삭제 스킵(해당 기간 데이터 없음 또는 오류): ${deleteError.message}. 선택 기간 CSV 업로드 진행.`);
  } else {
    devLog(`${startDate} ~ ${endDate} 기존 데이터 삭제 완료`);
  }

  report("광고주 데이터 조회 중...", 35);

  const { data: clientData, error: clientError } = await supabase
    .schema("ads")
    .from("client")
    .select("client_id, manager_id")
    .limit(SUPABASE_SELECT_MAX_ROWS);

  if (clientError) {
    throw new Error(`클라이언트 데이터 조회 오류: ${clientError.message}`);
  }

  const clientManagerMap: Record<string, number | null> = {};
  const existingClientIds = new Set<string>();
  for (const row of (clientData ?? []) as { client_id: string; manager_id: number | null }[]) {
    clientManagerMap[row.client_id] = row.manager_id;
    existingClientIds.add(row.client_id);
  }

  report("공휴일 조회 중...", 37);
  const holidays = await fetchHolidays(supabase);

  report("대상 레코드 필터링 중...", 45);

  const { recordsToInsert, newClientsToInsert } = buildUpsertPayload(
    records,
    {
      dateFilter: (dateStr) => dateStr >= startDate && dateStr <= endDate,
      clientManagerMap,
      existingClientIds,
      holidays,
    },
  );

  if (recordsToInsert.length === 0) {
    report("해당 기간의 CSV 데이터가 없습니다.", 100, `${startDate} ~ ${endDate}`);
    return;
  }

  report(
    "광고주 데이터 동기화 중...",
    50,
    `대상 레코드 ${recordsToInsert.length.toLocaleString()}개`,
  );

  await syncClients(supabase, newClientsToInsert, report);

  await insertDailyBatches(supabase, recordsToInsert, report);

  report(
    "완료!",
    100,
    `${recordsToInsert.length.toLocaleString()}개 레코드 강제 업데이트 완료`,
  );
}

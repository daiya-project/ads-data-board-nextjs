/**
 * CSV Uploader Module
 * CSV 데이터 다운로드 → 파싱 → 매핑 → DB 업데이트
 */

import { getSupabaseClient } from '@shared/api';
import { devLog } from './utils';
import { parseCSV } from './csv-parser';
import { CSV_DOWNLOAD_URL } from './csv-constants';
import type { ProgressCallback } from './csv-constants';
import { buildUpsertPayload } from './csv-mapper';

// Re-export for consumers
export type { CSVRecord } from './csv-parser';
export { parseCSV, parseDate } from './csv-parser';
export { CSV_SOURCE_URL, CSV_DOWNLOAD_URL } from './csv-constants';
export type { ProgressCallback } from './csv-constants';

const BATCH_SIZE = 1000;
const PROGRESS_INSERT_START = 55;
const PROGRESS_INSERT_END = 95;

async function syncClients(
  supabase: ReturnType<typeof getSupabaseClient>,
  newClientsToInsert: { client_id: number; client_name: string; manager_id: null }[],
  report: (stage: string, percent: number, detail?: string) => void
): Promise<void> {
  if (newClientsToInsert.length === 0) return;

  const uniqueClients: { client_id: number; client_name: string; manager_id: null }[] = [];
  const seenIds = new Set<number>();
  for (const client of newClientsToInsert) {
    if (!seenIds.has(client.client_id)) {
      uniqueClients.push(client);
      seenIds.add(client.client_id);
    }
  }
  devLog(`처리할 광고주: ${uniqueClients.length}개`);

  const clientIdsToCheck = uniqueClients.map((c) => c.client_id);
  const { data: existingInDb, error: checkError } = await supabase
    .from('ads_data_client')
    .select('client_id')
    .in('client_id', clientIdsToCheck);

  if (checkError) {
    devLog(`기존 광고주 확인 오류: ${checkError.message}`);
  }

  const existingInDbSet = new Set(
    ((existingInDb ?? []) as { client_id: number }[]).map((c) => c.client_id)
  );
  const reallyNewClients = uniqueClients.filter((c) => !existingInDbSet.has(c.client_id));
  const existingClients = uniqueClients.filter((c) => existingInDbSet.has(c.client_id));

  if (reallyNewClients.length > 0) {
    const { error: insertError } = await supabase
      .from('ads_data_client')
      .insert(reallyNewClients as unknown as Record<string, unknown>[]);

    if (insertError) {
      devLog(`새 광고주 추가 오류: ${insertError.message}`);
      for (const client of reallyNewClients) {
        const { error: singleError } = await supabase
          .from('ads_data_client')
          .insert([client as unknown as Record<string, unknown>]);
        if (singleError) {
          devLog(`광고주 ${client.client_id} 추가 실패: ${singleError.message}`);
        }
      }
    } else {
      devLog(`새 광고주 ${reallyNewClients.length}개 추가 완료`);
    }
  }

  if (existingClients.length > 0) {
    for (const client of existingClients) {
      const { error: updateError } = await supabase
        .from('ads_data_client')
        .update({ client_name: client.client_name })
        .eq('client_id', client.client_id);
      if (updateError) {
        devLog(`광고주 ${client.client_id} 업데이트 실패: ${updateError.message}`);
      }
    }
    devLog(`기존 광고주 ${existingClients.length}개 업데이트 완료`);
  }
}

async function insertDailyBatches(
  supabase: ReturnType<typeof getSupabaseClient>,
  recordsToInsert: unknown[],
  report: (stage: string, percent: number, detail?: string) => void
): Promise<void> {
  const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batchIdx = Math.floor(i / BATCH_SIZE);
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    const batchProgress =
      PROGRESS_INSERT_START +
      ((batchIdx + 1) / totalBatches) * (PROGRESS_INSERT_END - PROGRESS_INSERT_START);

    report(
      '데이터 저장 중...',
      Math.round(batchProgress),
      `${Math.min(i + BATCH_SIZE, recordsToInsert.length).toLocaleString()} / ${recordsToInsert.length.toLocaleString()} 레코드`
    );

    const { error: insertError } = await supabase
      .from('ads_data_daily')
      .insert(batch as unknown as Record<string, unknown>[]);

    if (insertError) {
      throw new Error(`데이터 삽입 오류 (배치 ${batchIdx + 1}): ${insertError.message}`);
    }
    devLog(`배치 ${batchIdx + 1}: ${batch.length}개 레코드 삽입 완료`);
  }
}

/**
 * CSV 데이터를 DB에 업데이트 (프로그레스 콜백 지원)
 */
export async function updateDataFromCSV(onProgress?: ProgressCallback): Promise<void> {
  const report = (stage: string, percent: number, detail?: string) => {
    onProgress?.({ stage, percent, detail });
  };

  report('CSV 데이터 다운로드 중...', 5);

  const supabase = getSupabaseClient();

  const response = await fetch(CSV_DOWNLOAD_URL);
  if (!response.ok) {
    throw new Error('CSV 데이터를 가져올 수 없습니다.');
  }
  const csvText = await response.text();

  report('CSV 파싱 중...', 15);

  const records = parseCSV(csvText);
  devLog(`총 ${records.length}개의 레코드 파싱 완료`);

  report('기존 데이터 조회 중...', 20);

  const { data: lastDateData, error: lastDateError } = await supabase
    .from('ads_data_daily')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (lastDateError && (lastDateError as { code?: string }).code !== 'PGRST116') {
    throw new Error(`마지막 날짜 조회 오류: ${(lastDateError as Error).message}`);
  }

  const lastDate = lastDateData?.date
    ? new Date((lastDateData as { date: string }).date)
    : null;

  report('광고주 데이터 조회 중...', 30);

  const { data: clientData, error: clientError } = await supabase
    .from('ads_data_client')
    .select('client_id, manager_id');

  if (clientError) {
    throw new Error(`클라이언트 데이터 조회 오류: ${clientError.message}`);
  }

  const clientManagerMap: Record<number, number | null> = {};
  const existingClientIds = new Set<number>();
  for (const row of clientData as { client_id: number; manager_id: number | null }[]) {
    clientManagerMap[row.client_id] = row.manager_id;
    existingClientIds.add(row.client_id);
  }

  const { data: holidaysData, error: holidaysError } = await supabase
    .from('shared_holiday')
    .select('holiday_date');

  if (holidaysError) {
    throw new Error(`공휴일 데이터 조회 오류: ${holidaysError.message}`);
  }

  const holidays = new Set<string>();
  for (const row of holidaysData as { holiday_date: string | Date }[]) {
    const dateStr =
      row.holiday_date instanceof Date
        ? row.holiday_date.toISOString().split('T')[0]
        : String(row.holiday_date).split('T')[0];
    holidays.add(dateStr);
  }

  report('신규 레코드 분류 중...', 40);

  const { recordsToInsert, newClientsToInsert } = buildUpsertPayload(records, {
    dateFilter: (dateStr) => !lastDate || new Date(dateStr) > lastDate,
    clientManagerMap,
    existingClientIds,
    holidays,
  });

  if (recordsToInsert.length === 0) {
    report('새로운 데이터가 없습니다.', 100, '최신 상태');
    return;
  }

  report('광고주 데이터 동기화 중...', 50, `신규 레코드 ${recordsToInsert.length.toLocaleString()}개 발견`);

  await syncClients(supabase, newClientsToInsert, report);

  await insertDailyBatches(supabase, recordsToInsert, report);

  report('완료!', 100, `${recordsToInsert.length.toLocaleString()}개 레코드 저장 완료`);
}

/**
 * 강제 업데이트: 지정 날짜 범위의 데이터를 삭제 후 CSV에서 재업로드
 */
export async function forceUpdateDataFromCSV(
  startDate: string,
  endDate: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const report = (stage: string, percent: number, detail?: string) => {
    onProgress?.({ stage, percent, detail });
  };

  report('CSV 데이터 다운로드 중...', 5);

  const supabase = getSupabaseClient();

  const response = await fetch(CSV_DOWNLOAD_URL);
  if (!response.ok) {
    throw new Error('CSV 데이터를 가져올 수 없습니다.');
  }
  const csvText = await response.text();

  report('CSV 파싱 중...', 15);

  const records = parseCSV(csvText);
  devLog(`총 ${records.length}개의 레코드 파싱 완료`);

  report('기존 데이터 삭제 중...', 25, `${startDate} ~ ${endDate}`);

  const { error: deleteError } = await supabase
    .from('ads_data_daily')
    .delete()
    .gte('date', startDate)
    .lte('date', endDate);

  if (deleteError) {
    throw new Error(`기존 데이터 삭제 오류: ${deleteError.message}`);
  }
  devLog(`${startDate} ~ ${endDate} 기존 데이터 삭제 완료`);

  report('광고주 데이터 조회 중...', 35);

  const { data: clientData, error: clientError } = await supabase
    .from('ads_data_client')
    .select('client_id, manager_id');

  if (clientError) {
    throw new Error(`클라이언트 데이터 조회 오류: ${clientError.message}`);
  }

  const clientManagerMap: Record<number, number | null> = {};
  const existingClientIds = new Set<number>();
  for (const row of clientData as { client_id: number; manager_id: number | null }[]) {
    clientManagerMap[row.client_id] = row.manager_id;
    existingClientIds.add(row.client_id);
  }

  const { data: holidaysData, error: holidaysError } = await supabase
    .from('shared_holiday')
    .select('holiday_date');

  if (holidaysError) {
    throw new Error(`공휴일 데이터 조회 오류: ${holidaysError.message}`);
  }

  const holidays = new Set<string>();
  for (const row of holidaysData as { holiday_date: string | Date }[]) {
    const dateStr =
      row.holiday_date instanceof Date
        ? row.holiday_date.toISOString().split('T')[0]
        : String(row.holiday_date).split('T')[0];
    holidays.add(dateStr);
  }

  report('대상 레코드 필터링 중...', 45);

  const { recordsToInsert, newClientsToInsert } = buildUpsertPayload(records, {
    dateFilter: (dateStr) => dateStr >= startDate && dateStr <= endDate,
    clientManagerMap,
    existingClientIds,
    holidays,
  });

  if (recordsToInsert.length === 0) {
    report('해당 기간의 CSV 데이터가 없습니다.', 100, `${startDate} ~ ${endDate}`);
    return;
  }

  report('광고주 데이터 동기화 중...', 50, `대상 레코드 ${recordsToInsert.length.toLocaleString()}개`);

  if (newClientsToInsert.length > 0) {
    const uniqueClients = newClientsToInsert.filter(
      (c, i, arr) => arr.findIndex((x) => x.client_id === c.client_id) === i
    );
    const clientIdsToCheck = uniqueClients.map((c) => c.client_id);
    const { data: existingInDb } = await supabase
      .from('ads_data_client')
      .select('client_id')
      .in('client_id', clientIdsToCheck);

    const existingInDbSet = new Set(
      ((existingInDb ?? []) as { client_id: number }[]).map((c) => c.client_id)
    );
    const reallyNewClients = uniqueClients.filter((c) => !existingInDbSet.has(c.client_id));

    if (reallyNewClients.length > 0) {
      const { error: insertError } = await supabase
        .from('ads_data_client')
        .insert(reallyNewClients as unknown as Record<string, unknown>[]);

      if (insertError) {
        devLog(`새 광고주 추가 오류: ${insertError.message}`);
        for (const client of reallyNewClients) {
          const { error: singleError } = await supabase
            .from('ads_data_client')
            .insert([client as unknown as Record<string, unknown>]);
          if (singleError) {
            devLog(`광고주 ${client.client_id} 추가 실패: ${singleError.message}`);
          }
        }
      } else {
        devLog(`새 광고주 ${reallyNewClients.length}개 추가 완료`);
      }
    }
  }

  await insertDailyBatches(supabase, recordsToInsert, report);

  report('완료!', 100, `${recordsToInsert.length.toLocaleString()}개 레코드 강제 업데이트 완료`);
}

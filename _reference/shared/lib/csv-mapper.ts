/**
 * CSV Uploader - CSV 레코드 → DB 삽입용 데이터 매핑
 */

import { devLog } from './utils';
import { cleanClientName } from './utils/format';
import type { CSVRecord } from './csv-parser';
import { parseDate } from './csv-parser';

export interface InsertDaily {
  date: string;
  client_id: number;
  client_name: string;
  amount: number;
  manager_id: number | null;
  is_holiday: boolean;
  vimp?: number;
  click?: number;
  conversion?: number;
}

export interface InsertClient {
  client_id: number;
  client_name: string;
  manager_id: null;
}

export interface BuildUpsertPayloadContext {
  /** 해당 날짜가 삽입 대상이면 true */
  dateFilter: (dateStr: string) => boolean;
  clientManagerMap: Record<number, number | null>;
  /** 기존+신규 클라이언트 ID (매퍼에서 신규 발견 시 추가함) */
  existingClientIds: Set<number>;
  holidays: Set<string>;
}

/**
 * CSV 레코드를 DB 삽입용 일별/광고주 데이터로 변환
 */
export function buildUpsertPayload(
  records: CSVRecord[],
  context: BuildUpsertPayloadContext
): { recordsToInsert: InsertDaily[]; newClientsToInsert: InsertClient[] } {
  const { dateFilter, clientManagerMap, existingClientIds, holidays } = context;
  const recordsToInsert: InsertDaily[] = [];
  const newClientsToInsert: InsertClient[] = [];
  const newClientIdsInCSV = new Set<number>();

  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i];
    const dateStr = parseDate(record.date);
    if (!dateStr) {
      devLog(`날짜 파싱 실패: ${record.date}`);
      continue;
    }
    if (!dateFilter(dateStr)) continue;

    const clientId = parseInt(record.client_id, 10);
    if (Number.isNaN(clientId)) {
      devLog(`client_id 파싱 실패: ${record.client_id}`);
      continue;
    }

    const amount = parseInt((record.amount ?? '0').replace(/,/g, ''), 10);
    if (Number.isNaN(amount)) {
      devLog(`amount 파싱 실패: ${record.amount}`);
      continue;
    }

    const clientName = cleanClientName(record.client_name);
    const isHoliday = holidays.has(dateStr);

    const vimp = record.vimp ? parseInt((record.vimp ?? '0').replace(/,/g, ''), 10) : undefined;
    const click = record.click ? parseInt((record.click ?? '0').replace(/,/g, ''), 10) : undefined;
    const conversion = record.conversion ? parseInt((record.conversion ?? '0').replace(/,/g, ''), 10) : undefined;

    if (!existingClientIds.has(clientId) && !newClientIdsInCSV.has(clientId)) {
      newClientsToInsert.push({
        client_id: clientId,
        client_name: clientName,
        manager_id: null,
      });
      newClientIdsInCSV.add(clientId);
      existingClientIds.add(clientId);
    }

    const dailyRecord: InsertDaily = {
      date: dateStr,
      client_id: clientId,
      client_name: clientName,
      amount,
      manager_id: clientManagerMap[clientId] ?? null,
      is_holiday: isHoliday,
    };

    if (!Number.isNaN(vimp) && vimp !== undefined) {
      dailyRecord.vimp = vimp;
    }
    if (!Number.isNaN(click) && click !== undefined) {
      dailyRecord.click = click;
    }
    if (!Number.isNaN(conversion) && conversion !== undefined) {
      dailyRecord.conversion = conversion;
    }

    recordsToInsert.push(dailyRecord);
  }

  return { recordsToInsert, newClientsToInsert };
}

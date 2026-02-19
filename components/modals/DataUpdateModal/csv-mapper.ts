/**
 * CSV record → DB insert payload mapping.
 * client_id is string only (40-data-main-rule).
 * Source: reference shared/lib/csv-mapper.ts
 */

import { cleanClientName, normalizeDate } from "@/lib/utils";
import type { CSVRecord } from "./csv-parser";
import { devLog } from "./devlog";

export interface InsertDaily {
  date: string;
  client_id: string;
  client_name: string;
  amount: number;
  manager_id: number | null;
  is_holiday: boolean;
  vimp?: number;
  click?: number;
  conversion?: number;
}

export interface InsertClient {
  client_id: string;
  client_name: string;
  manager_id: null;
}

export interface BuildUpsertPayloadContext {
  dateFilter: (dateStr: string) => boolean;
  clientManagerMap: Record<string, number | null>;
  existingClientIds: Set<string>;
  holidays: Set<string>;
}

/** CSV에서 날짜 컬럼 값 추출 (헤더가 date / Date / revenue_date 등일 수 있음) */
function getDateFromRecord(record: CSVRecord): string | undefined {
  const candidates = ["date", "Date", "revenue_date", "날짜"];
  for (const key of candidates) {
    const v = record[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/**
 * CSV 레코드를 ads.daily / ads.client 삽입용 데이터로 변환.
 * client_id는 문자열로 유지 (선행 0 보존).
 */
export function buildUpsertPayload(
  records: CSVRecord[],
  context: BuildUpsertPayloadContext,
): { recordsToInsert: InsertDaily[]; newClientsToInsert: InsertClient[] } {
  const { dateFilter, clientManagerMap, existingClientIds, holidays } = context;
  const recordsToInsert: InsertDaily[] = [];
  const newClientsToInsert: InsertClient[] = [];
  const newClientIdsInCSV = new Set<string>();

  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i];
    const rawDate = getDateFromRecord(record);
    const dateStr = normalizeDate(rawDate);
    if (!dateStr) {
      devLog(`날짜 정규화 실패 (raw): ${rawDate ?? "(빈값)"}`);
      continue;
    }
    if (!dateFilter(dateStr)) continue;

    const clientId = String(record.client_id ?? "").trim();
    if (!clientId) {
      devLog(`client_id 비어 있음: ${record.client_id}`);
      continue;
    }

    const amount = parseInt(
      (record.amount ?? "0").replace(/,/g, ""),
      10,
    );
    if (Number.isNaN(amount)) {
      devLog(`amount 파싱 실패: ${record.amount}`);
      continue;
    }

    const clientName = cleanClientName(record.client_name ?? "");
    const isHoliday = holidays.has(dateStr);

    const vimp = record.vimp
      ? parseInt((record.vimp ?? "0").replace(/,/g, ""), 10)
      : undefined;
    const click = record.click
      ? parseInt((record.click ?? "0").replace(/,/g, ""), 10)
      : undefined;
    const conversion = record.conversion
      ? parseInt((record.conversion ?? "0").replace(/,/g, ""), 10)
      : undefined;

    if (
      !existingClientIds.has(clientId) &&
      !newClientIdsInCSV.has(clientId)
    ) {
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

    if (vimp !== undefined && !Number.isNaN(vimp)) {
      dailyRecord.vimp = vimp;
    }
    if (click !== undefined && !Number.isNaN(click)) {
      dailyRecord.click = click;
    }
    if (conversion !== undefined && !Number.isNaN(conversion)) {
      dailyRecord.conversion = conversion;
    }

    recordsToInsert.push(dailyRecord);
  }

  return { recordsToInsert, newClientsToInsert };
}

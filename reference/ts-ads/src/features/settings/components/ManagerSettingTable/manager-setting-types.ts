/**
 * Manager Setting Table - 타입 정의
 */

export interface ManagerSettingClient {
  client_id: number;
  client_name: string | null;
  manager_id: number | null;
  second_manager_id?: number | null;
  outbound?: boolean;
  created_at?: string | null;
}

export type SortOrder = 'asc' | 'desc' | null;

export interface ManagerSortState {
  column: string | null;
  order: SortOrder;
}

export type LoadManagerSettingFn = () => void | Promise<void>;

export type LoadBulkManagerSelectFn = () => Promise<void>;

export type SetupManagerSettingEventsFn = (
  loadManagerSetting?: () => void | Promise<void>,
  saveSelectedManagers?: () => void | Promise<void>
) => void;

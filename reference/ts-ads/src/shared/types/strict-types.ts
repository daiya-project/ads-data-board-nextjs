/**
 * 엄격한 타입 시스템
 * Brand Type 및 타입 가드를 통한 런타임 안전성 강화
 */

// ============================================================================
// Brand Types (Nominal Typing)
// ============================================================================

/** Brand 타입 기본 형태 */
type Brand<T, B> = T & { __brand: B };

/** 매니저 ID (number + brand) */
export type ManagerId = Brand<number, 'ManagerId'>;

/** 클라이언트 ID (number + brand) */
export type ClientId = Brand<number, 'ClientId'>;

/** 목표 ID (number + brand) */
export type GoalId = Brand<number, 'GoalId'>;

/** 액션 아이템 ID (number + brand) */
export type ActionItemId = Brand<number, 'ActionItemId'>;

/** 날짜 문자열 (YYYY-MM-DD 형식) */
export type DateString = Brand<string, 'DateString'>;

/** 금액 (원 단위) */
export type Currency = Brand<number, 'Currency'>;

/** 퍼센트 (0-100) */
export type Percentage = Brand<number, 'Percentage'>;

/** 양수 */
export type PositiveNumber = Brand<number, 'PositiveNumber'>;

/** 비어있지 않은 문자열 */
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

// ============================================================================
// Brand Type 생성자 (Type Guards & Validators)
// ============================================================================

/**
 * ManagerId 생성
 * @throws 유효하지 않은 값일 경우
 */
export function createManagerId(value: number): ManagerId {
  if (!isValidId(value)) {
    throw new TypeError(`Invalid ManagerId: ${value}`);
  }
  return value as ManagerId;
}

/**
 * ManagerId 안전 생성 (null 반환)
 */
export function toManagerId(value: unknown): ManagerId | null {
  if (typeof value === 'number' && isValidId(value)) {
    return value as ManagerId;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isValidId(parsed)) {
      return parsed as ManagerId;
    }
  }
  return null;
}

/**
 * ClientId 생성
 */
export function createClientId(value: number): ClientId {
  if (!isValidId(value)) {
    throw new TypeError(`Invalid ClientId: ${value}`);
  }
  return value as ClientId;
}

/**
 * ClientId 안전 생성
 */
export function toClientId(value: unknown): ClientId | null {
  if (typeof value === 'number' && isValidId(value)) {
    return value as ClientId;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isValidId(parsed)) {
      return parsed as ClientId;
    }
  }
  return null;
}

/**
 * GoalId 생성
 */
export function createGoalId(value: number): GoalId {
  if (!isValidId(value)) {
    throw new TypeError(`Invalid GoalId: ${value}`);
  }
  return value as GoalId;
}

/**
 * GoalId 안전 생성
 */
export function toGoalId(value: unknown): GoalId | null {
  if (typeof value === 'number' && isValidId(value)) {
    return value as GoalId;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isValidId(parsed)) {
      return parsed as GoalId;
    }
  }
  return null;
}

/**
 * ActionItemId 생성
 */
export function createActionItemId(value: number): ActionItemId {
  if (!isValidId(value)) {
    throw new TypeError(`Invalid ActionItemId: ${value}`);
  }
  return value as ActionItemId;
}

/**
 * DateString 생성 (YYYY-MM-DD 형식 검증)
 */
export function createDateString(value: string): DateString {
  if (!isValidDateString(value)) {
    throw new TypeError(`Invalid DateString: ${value}. Expected YYYY-MM-DD format.`);
  }
  return value as DateString;
}

/**
 * DateString 안전 생성
 */
export function toDateString(value: unknown): DateString | null {
  if (typeof value === 'string' && isValidDateString(value)) {
    return value as DateString;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return formatToDateString(value);
  }
  return null;
}

/**
 * Date 객체를 DateString으로 변환
 */
export function formatToDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DateString;
}

/**
 * Currency 생성
 */
export function createCurrency(value: number): Currency {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError(`Invalid Currency: ${value}`);
  }
  return Math.round(value) as Currency;
}

/**
 * Currency 안전 생성
 */
export function toCurrency(value: unknown): Currency | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.round(value) as Currency;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[,원]/g, ''));
    if (!isNaN(parsed)) {
      return Math.round(parsed) as Currency;
    }
  }
  return null;
}

/**
 * Percentage 생성 (0-100 범위)
 */
export function createPercentage(value: number): Percentage {
  if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
    throw new TypeError(`Invalid Percentage: ${value}. Must be between 0 and 100.`);
  }
  return value as Percentage;
}

/**
 * Percentage 안전 생성 (범위 클램핑)
 */
export function toPercentage(value: unknown): Percentage | null {
  if (typeof value === 'number' && !isNaN(value)) {
    const clamped = Math.max(0, Math.min(100, value));
    return clamped as Percentage;
  }
  return null;
}

/**
 * PositiveNumber 생성
 */
export function createPositiveNumber(value: number): PositiveNumber {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    throw new TypeError(`Invalid PositiveNumber: ${value}. Must be greater than 0.`);
  }
  return value as PositiveNumber;
}

/**
 * NonEmptyString 생성
 */
export function createNonEmptyString(value: string): NonEmptyString {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`Invalid NonEmptyString: value is empty or not a string.`);
  }
  return value.trim() as NonEmptyString;
}

/**
 * NonEmptyString 안전 생성
 */
export function toNonEmptyString(value: unknown): NonEmptyString | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim() as NonEmptyString;
  }
  return null;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * 유효한 ID 검증 (양의 정수)
 */
export function isValidId(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0;
}

/**
 * 유효한 날짜 문자열 검증 (YYYY-MM-DD)
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) return false;

  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * ManagerId 타입 가드
 */
export function isManagerId(value: unknown): value is ManagerId {
  return isValidId(value);
}

/**
 * ClientId 타입 가드
 */
export function isClientId(value: unknown): value is ClientId {
  return isValidId(value);
}

/**
 * GoalId 타입 가드
 */
export function isGoalId(value: unknown): value is GoalId {
  return isValidId(value);
}

/**
 * DateString 타입 가드
 */
export function isDateString(value: unknown): value is DateString {
  return isValidDateString(value);
}

/**
 * Currency 타입 가드
 */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Percentage 타입 가드
 */
export function isPercentage(value: unknown): value is Percentage {
  return typeof value === 'number' &&
    !isNaN(value) &&
    value >= 0 &&
    value <= 100;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 특정 필드를 필수로 만드는 유틸리티 타입
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 특정 필드를 선택적으로 만드는 유틸리티 타입
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * null/undefined를 제외한 타입
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * 배열 요소 타입 추출
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Promise 결과 타입 추출
 */
export type Awaited<T> = T extends Promise<infer R> ? R : T;

/**
 * 객체의 모든 값 타입을 추출
 */
export type ValueOf<T> = T[keyof T];

/**
 * 읽기 전용 깊은 복사
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 부분 깊은 복사
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Domain-Specific Strict Types
// ============================================================================

/** 액션 아이템 상태 (리터럴 유니온) */
export type ActionStatus = 'progress' | 'done' | 'failed';

/** 목표 카테고리 (리터럴 유니온) */
export type GoalCategory = 'new' | 'upsales_big' | 'upsales_smb' | 'outbound' | 'etc';

/** 기간 타입 */
export type PeriodType = 'weekly' | 'monthly';

/** 엄격한 목표 데이터 */
export interface StrictGoal {
  id: GoalId;
  manager_id: ManagerId;
  start_date: DateString;
  end_date: DateString;
  goal_revenue: Currency;
  start_revenue: Currency;
  goal_category: GoalCategory | null;
  memo: string | null;
}

/** 엄격한 일일 매출 데이터 */
export interface StrictDailyRevenue {
  id: number;
  client_id: ClientId;
  manager_id: ManagerId | null;
  revenue_date: DateString;
  amount: Currency;
}

/** 엄격한 클라이언트 데이터 */
export interface StrictClient {
  client_id: ClientId;
  client_name: NonEmptyString;
  manager_id: ManagerId | null;
  second_manager_id: ManagerId | null;
}

/** 엄격한 매니저 데이터 */
export interface StrictManager {
  id: ManagerId;
  manager_name: NonEmptyString;
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * 값이 정의되어 있음을 단언
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

/**
 * 조건이 참임을 단언
 */
export function assert(
  condition: boolean,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * 절대 도달하지 않는 코드 (exhaustive check)
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message || `Unexpected value: ${value}`);
}

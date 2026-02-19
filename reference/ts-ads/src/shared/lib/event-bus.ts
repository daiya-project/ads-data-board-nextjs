/**
 * Feature 간 통신을 위한 타입 안전 이벤트 버스
 * CustomEvent 래퍼 — goal-events.ts 패턴 마이그레이션 완료.
 */

/**
 * Goal 관련 이벤트 (Feature 간 통신)
 */
export interface GoalEventMap {
  'goal:modal:close-requested': void;
  'goal:modal:closed': void;
  'goal:submitted': { goalId?: number };
  'goal:category-dropdown:update': { value: string };
}

type EventMap = GoalEventMap & Record<string, unknown>;

const eventTarget = typeof document !== 'undefined' ? new EventTarget() : (null as unknown as EventTarget);

/**
 * 이벤트 발행
 */
export function emit<T extends keyof EventMap>(name: T, detail: EventMap[T]): void {
  if (!eventTarget) return;
  eventTarget.dispatchEvent(new CustomEvent(String(name), { detail }));
}

/**
 * 이벤트 구독
 */
export function on<T extends keyof EventMap>(name: T, handler: (detail: EventMap[T]) => void): () => void {
  if (!eventTarget) return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<EventMap[T]>).detail);
  eventTarget.addEventListener(String(name), listener);
  return () => eventTarget.removeEventListener(String(name), listener);
}

/**
 * 이벤트 한 번만 구독
 */
export function once<T extends keyof EventMap>(name: T, handler: (detail: EventMap[T]) => void): () => void {
  if (!eventTarget) return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<EventMap[T]>).detail);
    eventTarget.removeEventListener(String(name), listener);
  };
  eventTarget.addEventListener(String(name), listener);
  return () => eventTarget.removeEventListener(String(name), listener);
}

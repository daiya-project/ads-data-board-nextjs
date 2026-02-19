/**
 * 개발 로그 유틸리티
 * 프로덕션 빌드(import.meta.env.DEV === false)에서는 출력하지 않음
 */

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

export function devLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args);
  }
}

/**
 * Navigation Feature — 라우터 (features/navigation)
 * 동적 import·코드 스플리팅 적용. 기존 src/router 대체.
 */

import {
  setupNavigation,
  setupSubNavigation,
  setupManagerTabs,
  setPageInitCallbacks,
  runInitialPageActivation,
} from './lib/router';
import type { PageInitCallbacks } from './lib/types';

export type { PageInitCallbacks };

/**
 * 라우팅 시스템 초기화.
 * bootstrap에서 호출. 초기 활성 페이지는 runInitialPageActivation으로 로드.
 */
export function initRouter(callbacks: PageInitCallbacks): void {
  setPageInitCallbacks(callbacks);
  setupNavigation();
  setupSubNavigation();
  setupManagerTabs();
  runInitialPageActivation();
}

export { setupNavigation, setupSubNavigation, setupManagerTabs, runInitialPageActivation } from './lib/router';

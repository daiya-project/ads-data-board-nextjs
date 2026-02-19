/**
 * Navigation feature — 라우트·콜백 타입
 */

/** 페이지 초기화 시 필요한 콜백 (bootstrap에서 주입) */
export interface PageInitCallbacks {
  initLoadManagerTabs: () => Promise<void>;
  loadGoalManagerOptions: () => Promise<void>;
  setupRegisterButtonListener: () => void;
  setupGoalSettingEvents: () => Promise<void>;
  loadManagerSetting: () => Promise<void>;
}

/** 현재 활성 Feature의 destroy만 보관 (페이지 이탈 시 호출) */
export interface CurrentFeatureHandle {
  destroy?: () => void;
}

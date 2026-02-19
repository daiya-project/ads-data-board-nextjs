/**
 * 에러 바운더리 시스템
 * 체계적인 에러 처리 및 폴백 메커니즘 제공
 */

import { devLog } from './devlog';
import { handleError } from './error';

/** 에러 바운더리 옵션 */
export interface ErrorBoundaryOptions<T> {
  /** 에러 발생 시 반환할 폴백 값 또는 함수 */
  fallback: T | (() => T);
  /** 에러 컨텍스트 (로깅용) */
  context: string;
  /** 사용자에게 표시할 메시지 (null이면 표시 안함) */
  userMessage?: string | null;
  /** 에러 발생 시 호출되는 콜백 */
  onError?: (error: Error, context: string) => void;
  /** 재시도 횟수 (기본값: 0) */
  retryCount?: number;
  /** 재시도 간격 (ms, 기본값: 1000) */
  retryDelay?: number;
}

/**
 * 비동기 함수를 에러 바운더리로 감싸서 실행
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  options: ErrorBoundaryOptions<T>
): Promise<T> {
  const {
    fallback,
    context,
    userMessage = null,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options;

  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts <= retryCount) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempts++;

      if (attempts <= retryCount) {
        devLog(`[${context}] 재시도 ${attempts}/${retryCount}...`);
        await sleep(retryDelay);
      }
    }
  }

  devLog(`[${context}] 에러 발생:`, lastError);

  if (onError && lastError) {
    onError(lastError, context);
  }

  if (userMessage) {
    handleError(lastError || new Error('Unknown error'), context, userMessage);
  }

  return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
}

/**
 * 동기 함수를 에러 바운더리로 감싸서 실행
 */
export function withSyncErrorBoundary<T>(
  fn: () => T,
  options: Omit<ErrorBoundaryOptions<T>, 'retryCount' | 'retryDelay'>
): T {
  const { fallback, context, userMessage = null, onError } = options;

  try {
    return fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    devLog(`[${context}] 에러 발생:`, err);

    if (onError) {
      onError(err, context);
    }

    if (userMessage) {
      handleError(err, context, userMessage);
    }

    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  }
}

/**
 * 컴포넌트 초기화를 위한 에러 바운더리
 */
export async function withComponentErrorBoundary(
  container: HTMLElement | null,
  fn: () => Promise<void>,
  options: {
    context: string;
    errorTitle?: string;
    errorMessage?: string;
    showRetryButton?: boolean;
    onRetry?: () => void;
  }
): Promise<void> {
  const {
    context,
    errorTitle = '오류가 발생했습니다',
    errorMessage = '잠시 후 다시 시도해주세요.',
    showRetryButton = true,
    onRetry
  } = options;

  try {
    await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    devLog(`[${context}] 컴포넌트 초기화 실패:`, err);

    if (container) {
      renderErrorUI(container, {
        title: errorTitle,
        message: errorMessage,
        showRetryButton,
        onRetry: onRetry || (() => window.location.reload())
      });
    }
  }
}

function renderErrorUI(
  container: HTMLElement,
  options: {
    title: string;
    message: string;
    showRetryButton: boolean;
    onRetry: () => void;
  }
): void {
  const { title, message, showRetryButton, onRetry } = options;

  container.innerHTML = `
    <div class="error-boundary" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--text-sub, #666);
    ">
      <div style="
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        border-radius: 50%;
        background: var(--glass-bg, rgba(255,255,255,0.7));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
      ">⚠️</div>
      <h3 style="
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main, #333);
      ">${title}</h3>
      <p style="
        margin: 0 0 20px;
        font-size: 14px;
        line-height: 1.5;
      ">${message}</p>
      ${showRetryButton ? `
        <button class="error-boundary__retry-btn" style="
          padding: 10px 24px;
          border: none;
          border-radius: var(--radius-pill, 20px);
          background: var(--primary, #4a90e2);
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        ">다시 시도</button>
      ` : ''}
    </div>
  `;

  if (showRetryButton) {
    const retryBtn = container.querySelector('.error-boundary__retry-btn');
    retryBtn?.addEventListener('click', onRetry);
  }
}

export async function safeBatchExecute<T>(
  promises: Promise<T>[],
  options: {
    context: string;
    onItemError?: (error: Error, index: number) => void;
  }
): Promise<Array<{ success: true; value: T } | { success: false; error: Error }>> {
  const { context, onItemError } = options;

  const results = await Promise.allSettled(promises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true as const, value: result.value };
    } else {
      const error = result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));

      devLog(`[${context}] 배치 아이템 ${index} 실패:`, error);

      if (onItemError) {
        onItemError(error, index);
      }

      return { success: false as const, error };
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isNetworkError(error: Error): boolean {
  return error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch') ||
    error.name === 'TypeError';
}

export function isTimeoutError(error: Error): boolean {
  return error.message.includes('timeout') ||
    error.name === 'TimeoutError';
}

export function isSupabaseError(error: unknown): error is { code: string; message: string; details?: string } {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error;
}

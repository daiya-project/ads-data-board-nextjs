/**
 * 에러 처리 유틸리티
 */

export function handleError(
  error: Error | string,
  context: string,
  userMessage: string | null = null
): void {
  console.error(`[${context}]`, error);
  if (userMessage) {
    alert(userMessage);
  }
}

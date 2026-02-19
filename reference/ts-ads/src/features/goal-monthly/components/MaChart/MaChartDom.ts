/**
 * Goal Monthly — MA 차트 DOM 유틸 (캔버스 복구 등)
 *
 * ensureChartCanvas를 cpc/cvr/vctr에서 재사용할 수 있도록 분리 (순환 의존성 방지).
 */

/**
 * 차트 영역에 캔버스가 없으면 복구 (지표 전환 후 empty 상태에서 복귀 시).
 */
export function ensureChartCanvas(canvasId: string): void {
  if (document.getElementById(canvasId)) return;
  const wrapper = document.querySelector('.MaChart__chart-wrapper');
  if (!wrapper) return;
  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  wrapper.innerHTML = '';
  wrapper.appendChild(canvas);
}

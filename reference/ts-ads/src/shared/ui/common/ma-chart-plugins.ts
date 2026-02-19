/**
 * MA 차트용 Chart.js 플러그인 — 영역 색칠, 세로 가이드선
 *
 * ma-chart-common.ts 의 renderMaChart 에서 사용.
 */

export function createFillBetweenLinesPlugin(
  canvasId: string,
  actualData: number[],
  maData: number[],
  colorAbove: string,
  colorBelow: string
): { id: string; beforeDatasetsDraw: (chart: unknown) => void } {
  return {
    id: `maFillBetween_${canvasId}`,
    beforeDatasetsDraw(chart: unknown) {
      const c = chart as {
        ctx: CanvasRenderingContext2D;
        getDatasetMeta: (i: number) => { data: { x: number; y: number }[] };
        scales: { y: { getPixelForValue: (v: number) => number } };
      };
      const { ctx, scales } = c;
      if (!scales?.y || actualData.length === 0 || actualData.length !== maData.length) return;

      const meta0 = c.getDatasetMeta(0);
      if (!meta0?.data?.length) return;

      const n = actualData.length;
      for (let i = 0; i < n - 1; i++) {
        const p0 = meta0.data[i] as { x: number; y: number };
        const p1 = meta0.data[i + 1] as { x: number; y: number };
        const yMa0 = scales.y.getPixelForValue(maData[i]);
        const yMa1 = scales.y.getPixelForValue(maData[i + 1]);

        const avgActual = (actualData[i] + actualData[i + 1]) / 2;
        const avgMa = (maData[i] + maData[i + 1]) / 2;
        const useRed = avgActual >= avgMa;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p1.x, yMa1);
        ctx.lineTo(p0.x, yMa0);
        ctx.closePath();
        ctx.fillStyle = useRed ? colorAbove : colorBelow;
        ctx.fill();
        ctx.restore();
      }
    },
  };
}

export function createVerticalGuidePlugin(canvasId: string): {
  id: string;
  afterDraw: (chart: unknown) => void;
} {
  return {
    id: `verticalGuideLine_${canvasId}`,
    afterDraw(chart: unknown) {
      const c = chart as {
        ctx: CanvasRenderingContext2D;
        getActiveElements: () => { element: { x: number } }[];
        scales: { y: { top: number; bottom: number } };
      };
      const active = c.getActiveElements();
      if (active.length > 0) {
        const x = active[0].element.x;
        const yAxis = c.scales.y;
        c.ctx.save();
        c.ctx.strokeStyle = 'rgba(156, 163, 175, 0.35)';
        c.ctx.lineWidth = 1;
        c.ctx.setLineDash([4, 4]);
        c.ctx.beginPath();
        c.ctx.moveTo(x, yAxis.top);
        c.ctx.lineTo(x, yAxis.bottom);
        c.ctx.stroke();
        c.ctx.restore();
      }
    },
  };
}

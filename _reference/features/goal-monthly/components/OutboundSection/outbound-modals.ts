/**
 * Outbound Section - 모달 관리 (일별/주간/월별)
 */

import { getSupabaseClientSafe } from '@shared/api';
import { formatNumberWithCommas, devLog } from '@shared/lib';
import { formatDateKorean, formatWeekRangeKorean, formatDateCompact, parseClientName } from './outbound-format';

const MODAL_ID = 'outbound-daily-detail-modal';
const WEEKLY_MODAL_ID = 'outbound-weekly-detail-modal';
const MONTHLY_MODAL_ID = 'outbound-monthly-detail-modal';

/**
 * 일별 상세 모달 열기
 */
export async function openDailyDetailModal(dateStr: string): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  closeDailyDetailModal();

  try {
    const result = await (supabase
      .from('ads_data_v_outbound')
      .select('client_id, client_name, amount')
      .eq!('date', dateStr)
      .order('amount', { ascending: false }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (result.error || !result.data) {
      devLog('[Outbound] 모달 데이터 조회 실패:', result.error);
      return;
    }

    const rows = result.data as { client_id: number; client_name: string; amount: number }[];
    if (rows.length === 0) return;

    const activeRows = rows.filter(r => (parseFloat(String(r.amount)) || 0) > 0);
    const activeCount = activeRows.length;
    const totalRevenue = activeRows.reduce((s, r) => s + (parseFloat(String(r.amount)) || 0), 0);

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'outbound-modal-overlay';

    const clientRows = rows.map((r, idx) => {
      const amt = parseFloat(String(r.amount)) || 0;
      const isZero = amt === 0;
      const zeroClass = isZero ? ' outbound-modal-row--zero' : '';
      const { main: clientMain, sub: clientSub } = parseClientName(r.client_name);
      const subHtml = clientSub
        ? `<span class="outbound-modal-client-sub">${clientSub}</span>`
        : '';
      return `
        <div class="outbound-modal-row${zeroClass}">
          <span class="outbound-modal-index">${idx + 1}</span>
          <span class="outbound-modal-client">
            <span class="outbound-modal-client-main">${clientMain}</span>
            ${subHtml}
          </span>
          <span class="outbound-modal-amount">${isZero ? '0' : formatNumberWithCommas(Math.round(amt))}</span>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="outbound-modal-content">
        <div class="outbound-modal-header">
          <h3 class="outbound-modal-title">${formatDateKorean(dateStr)}</h3>
          <div class="outbound-modal-stats">
            <span class="outbound-modal-stat">${activeCount}<span class="outbound-modal-stat-unit">개</span></span>
            <span class="outbound-modal-stat-divider">/</span>
            <span class="outbound-modal-stat">${formatNumberWithCommas(Math.round(totalRevenue))}<span class="outbound-modal-stat-unit">원</span></span>
          </div>
        </div>
        <div class="outbound-modal-body">
          ${clientRows}
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement) === overlay) {
        closeDailyDetailModal();
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDailyDetailModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
  } catch (error) {
    devLog('[Outbound] 모달 열기 실패:', error);
  }
}

export function closeDailyDetailModal(): void {
  const existing = document.getElementById(MODAL_ID);
  if (existing) {
    existing.classList.remove('active');
    setTimeout(() => existing.remove(), 200);
  }
}

/**
 * 주간 상세 모달 열기
 */
export async function openWeeklyDetailModal(weekStart: string, weekEnd: string): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  closeWeeklyDetailModal();

  try {
    const result = await (supabase
      .from('ads_data_v_outbound')
      .select('client_id, client_name, amount')
      .gte!('date', weekStart)
      .lte!('date', weekEnd)
      .order('amount', { ascending: false }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (result.error || !result.data) {
      devLog('[Outbound] 주간 모달 데이터 조회 실패:', result.error);
      return;
    }

    const rawRows = result.data as { client_id: number; client_name: string; amount: number }[];
    if (rawRows.length === 0) return;

    const clientMap = new Map<number, { client_id: number; client_name: string; totalAmount: number }>();
    for (const r of rawRows) {
      const amt = parseFloat(String(r.amount)) || 0;
      const existing = clientMap.get(r.client_id);
      if (existing) {
        existing.totalAmount += amt;
      } else {
        clientMap.set(r.client_id, {
          client_id: r.client_id,
          client_name: r.client_name,
          totalAmount: amt,
        });
      }
    }

    const clients = [...clientMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);
    const activeClients = clients.filter(c => c.totalAmount > 0);
    const activeCount = activeClients.length;
    const totalRevenue = activeClients.reduce((s, c) => s + c.totalAmount, 0);

    const overlay = document.createElement('div');
    overlay.id = WEEKLY_MODAL_ID;
    overlay.className = 'outbound-modal-overlay';

    const clientRows = clients.map((c, idx) => {
      const isZero = c.totalAmount === 0;
      const zeroClass = isZero ? ' outbound-modal-row--zero' : '';
      const { main: clientMain, sub: clientSub } = parseClientName(c.client_name);
      const subHtml = clientSub
        ? `<span class="outbound-modal-client-sub">${clientSub}</span>`
        : '';
      return `
        <div class="outbound-modal-row${zeroClass}">
          <span class="outbound-modal-index">${idx + 1}</span>
          <span class="outbound-modal-client">
            <span class="outbound-modal-client-main">${clientMain}</span>
            ${subHtml}
          </span>
          <span class="outbound-modal-amount">${isZero ? '0' : formatNumberWithCommas(Math.round(c.totalAmount))}</span>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="outbound-modal-content">
        <div class="outbound-modal-header">
          <h3 class="outbound-modal-title">${formatWeekRangeKorean(weekStart, weekEnd)}</h3>
          <div class="outbound-modal-stats">
            <span class="outbound-modal-stat">${activeCount}<span class="outbound-modal-stat-unit">개</span></span>
            <span class="outbound-modal-stat-divider">/</span>
            <span class="outbound-modal-stat">${formatNumberWithCommas(Math.round(totalRevenue))}<span class="outbound-modal-stat-unit">원</span></span>
          </div>
        </div>
        <div class="outbound-modal-body">
          ${clientRows}
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement) === overlay) {
        closeWeeklyDetailModal();
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWeeklyDetailModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
  } catch (error) {
    devLog('[Outbound] 주간 모달 열기 실패:', error);
  }
}

export function closeWeeklyDetailModal(): void {
  const existing = document.getElementById(WEEKLY_MODAL_ID);
  if (existing) {
    existing.classList.remove('active');
    setTimeout(() => existing.remove(), 200);
  }
}

/**
 * 월별 상세 모달 열기
 */
export async function openMonthlyDetailModal(monthStr: string): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  closeMonthlyDetailModal();

  try {
    const [yearNum, monthNum] = monthStr.split('-').map(Number);
    const monthStart = `${monthStr}-01`;
    const monthEnd = new Date(yearNum, monthNum, 0).toISOString().slice(0, 10);

    const viewResult = await (supabase
      .from('ads_data_v_outbound')
      .select('client_id, client_name, amount, outbound_start, outbound_end')
      .gte!('date', monthStart)
      .lte!('date', monthEnd)
      .order('amount', { ascending: false }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (viewResult.error || !viewResult.data) {
      devLog('[Outbound] 월별 모달 데이터 조회 실패:', viewResult.error);
      return;
    }

    const rawRows = viewResult.data as {
      client_id: number;
      client_name: string;
      amount: number;
      outbound_start: string;
      outbound_end: string;
    }[];

    if (rawRows.length === 0) return;

    const clientMap = new Map<number, {
      client_id: number;
      client_name: string;
      totalAmount: number;
      outbound_start: string;
      outbound_end: string;
    }>();

    for (const r of rawRows) {
      const amt = parseFloat(String(r.amount)) || 0;
      const existing = clientMap.get(r.client_id);
      if (existing) {
        existing.totalAmount += amt;
      } else {
        clientMap.set(r.client_id, {
          client_id: r.client_id,
          client_name: r.client_name,
          totalAmount: amt,
          outbound_start: r.outbound_start?.split('T')[0] || '',
          outbound_end: r.outbound_end?.split('T')[0] || '',
        });
      }
    }

    const clients = [...clientMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);
    const activeClients = clients.filter(c => c.totalAmount > 0);
    const activeCount = activeClients.length;
    const totalRevenue = activeClients.reduce((s, c) => s + c.totalAmount, 0);

    const overlay = document.createElement('div');
    overlay.id = MONTHLY_MODAL_ID;
    overlay.className = 'outbound-modal-overlay';

    const clientRows = clients.map((c, idx) => {
      const isZero = c.totalAmount === 0;
      const zeroClass = isZero ? ' outbound-modal-row--zero' : '';
      const periodStr = c.outbound_start && c.outbound_end
        ? `${formatDateCompact(c.outbound_start)} - ${formatDateCompact(c.outbound_end)}`
        : '';
      const { main: clientMain, sub: clientSub } = parseClientName(c.client_name);
      const subHtml = clientSub
        ? `<span class="outbound-modal-client-sub">${clientSub}</span>`
        : '';
      return `
        <div class="outbound-modal-row outbound-modal-row--monthly${zeroClass}">
          <span class="outbound-modal-index">${idx + 1}</span>
          <span class="outbound-modal-client">
            <span class="outbound-modal-client-main">${clientMain}</span>
            ${subHtml}
          </span>
          <span class="outbound-modal-period">${periodStr}</span>
          <span class="outbound-modal-amount">${isZero ? '0' : formatNumberWithCommas(Math.round(c.totalAmount))}</span>
        </div>
      `;
    }).join('');

    const monthLabel = `${yearNum}년 ${String(monthNum).padStart(2, '0')}월`;

    overlay.innerHTML = `
      <div class="outbound-modal-content outbound-modal-content--wide">
        <div class="outbound-modal-header">
          <h3 class="outbound-modal-title">${monthLabel}</h3>
          <div class="outbound-modal-stats">
            <span class="outbound-modal-stat">${activeCount}<span class="outbound-modal-stat-unit">개</span></span>
            <span class="outbound-modal-stat-divider">/</span>
            <span class="outbound-modal-stat">${formatNumberWithCommas(Math.round(totalRevenue))}<span class="outbound-modal-stat-unit">원</span></span>
          </div>
        </div>
        <div class="outbound-modal-body">
          ${clientRows}
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement) === overlay) {
        closeMonthlyDetailModal();
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMonthlyDetailModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
  } catch (error) {
    devLog('[Outbound] 월별 모달 열기 실패:', error);
  }
}

export function closeMonthlyDetailModal(): void {
  const existing = document.getElementById(MONTHLY_MODAL_ID);
  if (existing) {
    existing.classList.remove('active');
    setTimeout(() => existing.remove(), 200);
  }
}

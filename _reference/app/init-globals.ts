/**
 * CDN 제거 후 npm 패키지로 Chart.js, Supabase 전역 초기화.
 * main.ts에서 가장 먼저 import되어 window.Chart, window.supabase를 설정한다.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '../shared/types';

declare global {
  interface Window {
    Chart?: typeof import('chart.js').Chart;
    supabase?: SupabaseClient | null;
  }
}

// 환경 변수에서 Supabase URL/키 로드 (.env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseKey || typeof supabaseKey !== 'string' || !supabaseKey.trim()) {
  console.warn('[Supabase] .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정하세요.');
  window.supabase = null;
} else {
  try {
    window.supabase = createClient(supabaseUrl.trim(), supabaseKey.trim()) as unknown as SupabaseClient;
  } catch (e) {
    console.error('Supabase 클라이언트 생성 실패:', e);
    window.supabase = null;
  }
}

// Chart.js: npm 패키지 전역 노출. v4는 tree-shaking으로 스케일/컨트롤 미등록 → 'chart.js/auto'로 전체 등록
import Chart from 'chart.js/auto';
window.Chart = Chart;

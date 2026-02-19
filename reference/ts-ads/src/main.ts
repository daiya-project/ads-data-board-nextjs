/**
 * 광고 데이터 보드 - 메인 진입점
 * 진입·와이어링만 유지. 초기화 로직은 bootstrap.ts 참조.
 * Phase 7: Chart.js / Supabase npm 전역 초기화, main.css는 여기서 로드.
 */

import './app/init-globals';
import './app/styles/main.css';
import './app/shared-ui-styles';
import '@shared/lib';
import { runApp } from './app/bootstrap';

document.addEventListener('DOMContentLoaded', runApp);

/**
 * CSV Uploader - URL 및 타입 상수
 */

/** Google Sheets CSV 원본 URL */
export const CSV_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/1NRIdkAOBdemFO7_6AIocIcynH7c6iH82xMLURDOG9iU/edit?gid=3921937#gid=3921937';

/** Google Sheets CSV 다운로드(pub) URL */
export const CSV_DOWNLOAD_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4e6zINwh9KgG1Io80NtwYcT0c4tIC4fszfXiAbtq41RvVinQmeqbJORmmibTcu9sG5zNUAB6jNikR/pub?gid=3921937&single=true&output=csv';

/** 프로그레스 콜백 */
export type ProgressCallback = (info: {
  stage: string;
  percent: number;
  detail?: string;
}) => void;

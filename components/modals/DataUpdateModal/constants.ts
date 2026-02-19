/**
 * CSV data source URLs and types for data update flow.
 * Source: reference shared/lib/csv-constants.ts
 */

/** Google Sheets CSV source (edit) URL — opened by "CSV" button */
export const CSV_SOURCE_URL =
  process.env.NEXT_PUBLIC_CSV_SOURCE_URL ??
  "https://docs.google.com/spreadsheets/d/1NRIdkAOBdemFO7_6AIocIcynH7c6iH82xMLURDOG9iU/edit?gid=3921937#gid=3921937";

/** Google Sheets CSV download (pub) URL — used for fetch in import */
export const CSV_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_CSV_DOWNLOAD_URL ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4e6zINwh9KgG1Io80NtwYcT0c4tIC4fszfXiAbtq41RvVinQmeqbJORmmibTcu9sG5zNUAB6jNikR/pub?gid=3921937&single=true&output=csv";

/** Progress callback for CSV import (stage, percent, optional detail) */
export type ProgressCallback = (info: {
  stage: string;
  percent: number;
  detail?: string;
}) => void;

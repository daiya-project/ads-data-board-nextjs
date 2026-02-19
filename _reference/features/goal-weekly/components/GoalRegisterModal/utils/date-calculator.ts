/**
 * 목표 등록 날짜 계산 유틸리티
 */

import { formatDate } from '@shared/lib';

export interface WeekMonthDates {
  start_date: string;
  end_date: string;
}

export function calculateWeeklyDates(inputDate: Date): WeekMonthDates {
  const dayOfWeek = inputDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(inputDate);
  monday.setDate(inputDate.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start_date: formatDate(monday),
    end_date: formatDate(sunday),
  };
}

export function calculateMonthlyDates(inputDate: Date): WeekMonthDates {
  const year = inputDate.getFullYear();
  const month = inputDate.getMonth();

  const firstDay = new Date(year, month, 1);
  firstDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(year, month + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  return {
    start_date: formatDate(firstDay),
    end_date: formatDate(lastDay),
  };
}

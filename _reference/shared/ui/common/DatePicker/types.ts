/**
 * DatePicker 도메인 타입
 */

export interface DatePickerState {
  currentDate: Date;
  targetInputId?: string;
  selectedDate?: Date | null;
}

export interface LastPercentage {
  value: number | null;
}

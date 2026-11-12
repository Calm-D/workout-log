import dayjs from 'dayjs';

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export interface CalendarCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function dateStr(value: dayjs.Dayjs): string {
  return value.format('YYYY-MM-DD');
}

export function isToday(value: string): boolean {
  return value === todayStr();
}

export function isPast(value: string): boolean {
  return value < todayStr();
}

export function isFuture(value: string): boolean {
  return value > todayStr();
}

export function weekdayLabel(value: string): string {
  const index = (dayjs(value).day() + 6) % 7;
  return WEEKDAY_LABELS[index];
}

export function dateLabel(value: string): string {
  const d = dayjs(value);
  const prefix = isToday(value) ? '今天 · ' : '';
  return `${prefix}${d.format('M月D日')} 周${weekdayLabel(value)}`;
}

export function monthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export function monthMatrix(year: number, month: number): CalendarCell[] {
  const first = dayjs(new Date(year, month, 1));
  const offset = (first.day() + 6) % 7;
  const start = first.subtract(offset, 'day');
  const today = todayStr();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = start.add(i, 'day');
    cells.push({
      date: d.format('YYYY-MM-DD'),
      day: d.date(),
      inMonth: d.month() === month,
      isToday: d.format('YYYY-MM-DD') === today,
    });
  }
  return cells;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = dayjs(new Date(year, month, 1)).add(delta, 'month');
  return { year: d.year(), month: d.month() };
}

export function shortDate(value: string): string {
  return dayjs(value).format('M/D');
}

export function formatTimeHM(timestamp?: number): string {
  return timestamp ? dayjs(timestamp).format('HH:mm') : '';
}

export function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm');
}

export function daysAgo(days: number): string {
  return dayjs().subtract(days, 'day').format('YYYY-MM-DD');
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatRestCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDurationShort(ms: number): string {
  if (ms <= 0) return '—';
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}小时${minutes > 0 ? `${minutes}分` : ''}`;
  if (minutes > 0) return `${minutes}分${seconds > 0 ? `${seconds}秒` : ''}`;
  return `${seconds}秒`;
}

export function currentMonth(): { year: number; month: number } {
  const d = dayjs();
  return { year: d.year(), month: d.month() };
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function getMonthName(monthNumber: number): string {
  // 1-based month (1 to 12)
  const idx = Math.max(0, Math.min(11, monthNumber - 1));
  return MONTH_NAMES[idx];
}

export function getShortMonthName(monthNumber: number): string {
  const idx = Math.max(0, Math.min(11, monthNumber - 1));
  return MONTH_NAMES_SHORT[idx];
}

export function formatMonthYearLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return `${getMonthName(month)} ${year}`;
}

export function formatShortMonthYearLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return `${getShortMonthName(month)}/${year.toString().slice(-2)}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function addMonthsToDate(dateString: string, monthsToAdd: number): { date: string; monthKey: string } {
  // dateString is YYYY-MM-DD
  const parts = dateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based
  const day = parseInt(parts[2] || '1', 10);

  const targetDate = new Date(year, month + monthsToAdd, 1);
  // Get maximum days in target month to avoid overflow (e.g. Feb 31 -> Mar 3)
  const maxDays = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  targetDate.setDate(targetDay);

  const targetYear = targetDate.getFullYear();
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  const targetDayStr = String(targetDate.getDate()).padStart(2, '0');

  return {
    date: `${targetYear}-${targetMonth}-${targetDayStr}`,
    monthKey: `${targetYear}-${targetMonth}`,
  };
}

export function formatFriendlyDate(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length < 3) return dateString;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  return `${day} de ${getShortMonthName(month)}`;
}

export const ALL_MONTHS = MONTH_NAMES.map((name, index) => ({
  number: index + 1,
  name,
  shortName: MONTH_NAMES_SHORT[index],
}));

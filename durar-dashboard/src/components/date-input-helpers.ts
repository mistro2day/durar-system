export function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseInput(raw: string): Date | null {
  if (!raw) return null;
  const [y, m, d] = raw.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function buildCalendar(viewDate: Date) {
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startOffset = (start.getDay() + 6) % 7; // Saturday first
  const totalDays = end.getDate();
  const days: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toDateInput(iso?: string) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return formatDate(dt);
}

export function fromDateInput(dateStr: string) {
  if (!dateStr) return "";
  const parsed = parseInput(dateStr);
  if (!parsed) return "";
  return parsed.toISOString();
}

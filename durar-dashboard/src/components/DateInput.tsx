import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export function toDateInput(iso?: string) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return formatDate(dt);
}

export function fromDateInput(dateStr: string) {
  if (!dateStr) return "" as any;
  const parsed = parseInput(dateStr);
  if (!parsed) return "" as any;
  return parsed.toISOString();
}

type Props = {
  value?: string;
  onChange: (value: string) => void;
};

export default function DateInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [viewDate, setViewDate] = useState<Date>(() => parseInput(value || "") || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
    const parsed = parseInput(value || "");
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const weeks = useMemo(() => buildCalendar(viewDate), [viewDate]);
  const selectedDate = useMemo(() => parseInput(inputValue || ""), [inputValue]);

  function handleSelect(date: Date) {
    const formatted = formatDate(date);
    setInputValue(formatted);
    onChange(formatted);
    setOpen(false);
  }

  function handleInputChange(next: string) {
    const sanitized = next.replace(/[^\d-]/g, "").slice(0, 10);
    setInputValue(sanitized);
    onChange(sanitized);
  }

  function handleBlur() {
    if (!inputValue) return;
    const parsed = parseInput(inputValue);
    if (!parsed) {
      setInputValue("");
      onChange("");
    }
  }

  function handleToday() {
    const today = new Date();
    setViewDate(today);
    handleSelect(today);
  }

  function handleClear() {
    setInputValue("");
    onChange("");
    setOpen(false);
  }

  function goMonth(delta: number) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          className="form-input pr-10"
          placeholder="yyyy-mm-dd"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
        />
        <button
          type="button"
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="عرض التقويم"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
          <header className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/10">
            <button
              type="button"
              className="p-1 rounded hover:bg-indigo-500/10"
              onClick={() => goMonth(-1)}
              aria-label="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold text-gray-700 dark:text-slate-100">
              {viewDate.toLocaleDateString("ar-EG", { year: "numeric", month: "long" })}
            </div>
            <button
              type="button"
              className="p-1 rounded hover:bg-indigo-500/10"
              onClick={() => goMonth(1)}
              aria-label="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-slate-300">
                {WEEK_DAYS.map((day) => (
                  <th key={day} className="py-2 text-center font-normal">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, idx) => (
                <tr key={idx}>
                  {week.map((day, index) => {
                    if (!day) {
                      return <td key={index} className="h-10" />;
                    }
                    const isSelected =
                      selectedDate &&
                      day.getFullYear() === selectedDate.getFullYear() &&
                      day.getMonth() === selectedDate.getMonth() &&
                      day.getDate() === selectedDate.getDate();
                    const isToday = isSameDay(day, new Date());
                    return (
                      <td key={index} className="px-1 py-1">
                        <button
                          type="button"
                          className={`flex h-9 w-full items-center justify-center rounded-lg text-sm transition ${
                            isSelected
                              ? "bg-indigo-500 text-white"
                              : "hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
                          } ${isToday && !isSelected ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-700 dark:text-slate-200"}`}
                          onClick={() => handleSelect(day)}
                        >
                          {day.getDate()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs text-gray-600 dark:border-white/10 dark:text-slate-300">
            <button type="button" className="hover:text-indigo-600" onClick={handleToday}>
              اليوم
            </button>
            <div className="flex items-center gap-3">
              <button type="button" className="hover:text-indigo-600" onClick={handleClear}>
                مسح
              </button>
              <button type="button" className="hover:text-indigo-600" onClick={() => setOpen(false)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

const WEEK_DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

function buildCalendar(viewDate: Date) {
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

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseInput(raw: string): Date | null {
  if (!raw) return null;
  const [y, m, d] = raw.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

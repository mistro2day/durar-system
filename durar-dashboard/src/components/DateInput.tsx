import { } from "react";

export function toDateInput(iso?: string) {
  if (!iso) return "";
  const dt = new Date(iso);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateInput(dateStr: string) {
  if (!dateStr) return "" as any;
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toISOString();
}

export default function DateInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <input type="date" className="form-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

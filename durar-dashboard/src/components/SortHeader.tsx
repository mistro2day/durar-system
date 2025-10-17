import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { SortDirection } from "../hooks/useTableSort";

type Props = {
  label: string;
  active: boolean;
  direction: SortDirection | null;
  onToggle: () => void;
  align?: "left" | "right" | "center";
  className?: string;
};

export default function SortHeader({ label, active, direction, onToggle, align = "left", className = "" }: Props) {
  const icon =
    direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : direction === "desc" ? (
      <ArrowDown className="h-3.5 w-3.5" />
    ) : (
      <ChevronsUpDown className="h-3.5 w-3.5 opacity-70" />
    );

  const alignment =
    align === "center"
      ? "justify-center text-center"
      : align === "left"
        ? "justify-start text-left"
        : "justify-end text-right";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-semibold transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:hover:bg-indigo-500/10 ${alignment} ${className}`}
    >
      <span>{label}</span>
      <span className={`text-indigo-500 ${active ? "" : "opacity-70"}`}>{icon}</span>
    </button>
  );
}


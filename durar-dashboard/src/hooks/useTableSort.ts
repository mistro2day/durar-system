import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

type Accessors<T, Key extends string> = Record<Key, (item: T) => unknown>;

export function useTableSort<T, Key extends string>(
  items: T[],
  accessors: Accessors<T, Key>,
  initialState?: SortState<Key>
) {
  const [sortState, setSortState] = useState<SortState<Key> | null>(initialState ?? null);

  const sortedItems = useMemo(() => {
    if (!sortState) return items;
    const accessor = accessors[sortState.key];
    if (!accessor) return items;
    const directionMultiplier = sortState.direction === "asc" ? 1 : -1;
    return [...items].sort((a, b) => compareValues(accessor(a), accessor(b)) * directionMultiplier);
  }, [accessors, items, sortState]);

  function toggleSort(key: Key) {
    setSortState((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  }

  return { sortedItems, sortState, toggleSort };
}

function compareValues(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (typeof normalizedA === "number" && typeof normalizedB === "number") {
    return normalizedA - normalizedB;
  }

  if (typeof normalizedA === "string" && typeof normalizedB === "string") {
    return normalizedA.localeCompare(normalizedB, "ar");
  }

  return 0;
}

function normalize(value: unknown): string | number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && value.length >= 8) {
      return parsed;
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed !== "") {
      return numeric;
    }
    return trimmed;
  }

  if (typeof value === "object" && value) {
    if ("valueOf" in value) {
      const val = (value as { valueOf: () => unknown }).valueOf();
      if (typeof val === "string" || typeof val === "number") {
        return normalize(val);
      }
    }
    return normalize(String(value));
  }

  return normalize(String(value ?? ""));
}


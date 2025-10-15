import { useSyncExternalStore } from "react";
import { getLocaleTag } from "./settings";

function subscribe(callback: () => void) {
  const handler = () => callback();
  window.addEventListener("settings:changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("settings:changed", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useLocaleTag() {
  return useSyncExternalStore(subscribe, () => getLocaleTag());
}


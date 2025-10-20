import { useEffect, useState } from "react";
import type { ThemeMode } from "../lib/theme";

function getCurrentMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => getCurrentMode());

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      setMode(getCurrentMode());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return mode;
}

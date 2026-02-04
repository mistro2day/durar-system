import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getPreferredTheme, setTheme, type ThemeMode } from "../lib/theme";

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => (typeof window !== 'undefined' ? getPreferredTheme() : 'light'));

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function toggle() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    setTheme(next);
  }

  return (
    <button onClick={toggle} className="btn-outline text-gray-900 dark:text-gray-200" aria-label="Toggle theme">
      {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="hidden sm:inline">{mode === 'dark' ? 'وضع نهاري' : 'وضع ليلي'}</span>
    </button>
  );
}


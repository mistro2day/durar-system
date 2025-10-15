export type ThemeMode = 'light' | 'dark';

const KEY = 'themeMode';

export function getSavedTheme(): ThemeMode | null {
  const v = localStorage.getItem(KEY);
  return (v === 'dark' || v === 'light') ? v : null;
}

export function getPreferredTheme(): ThemeMode {
  const saved = getSavedTheme();
  if (saved) return saved;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') root.setAttribute('data-theme', 'dark');
  else root.setAttribute('data-theme', 'light');
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(KEY, mode);
  applyTheme(mode);
}


// Lightweight currency formatter allowing a custom SAR symbol instead of "ر.س"
export type CurrencyOpts = {
  locale?: string;
  symbol?: string; // default from env or ﷼
  position?: 'prefix' | 'suffix'; // default 'suffix' for ar
  fractionDigits?: number; // default 0
};

const env = (import.meta as any).env || {};
export const CURRENCY_SYMBOL: string = env.VITE_CURRENCY_SYMBOL || '﷼';
const DEFAULT_POS: 'prefix' | 'suffix' = (env.VITE_CURRENCY_POS === 'prefix' ? 'prefix' : 'suffix');

export function formatSAR(value: number | string | null | undefined, opts: CurrencyOpts = {}): string {
  const locale = opts.locale || (env.VITE_DEFAULT_LOCALE === 'en' ? 'en-US' : 'ar-SA');
  const n = Number(value ?? 0);
  const digits = typeof opts.fractionDigits === 'number' ? opts.fractionDigits : 0;
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);
  const symbol = (opts.symbol ?? CURRENCY_SYMBOL) as string;
  const position = (opts.position ?? DEFAULT_POS) as 'prefix' | 'suffix';
  const nbsp = '\u00A0';
  return position === 'prefix' ? `${symbol}${nbsp}${formatted}` : `${formatted}${nbsp}${symbol}`;
}

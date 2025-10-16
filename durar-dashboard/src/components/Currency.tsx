import { formatSAR, CURRENCY_SYMBOL } from "../lib/currency";

export default function Currency({ amount, locale, position, className }: { amount: number; locale?: string; position?: 'prefix' | 'suffix'; className?: string }) {
  const text = formatSAR(amount, { locale, symbol: CURRENCY_SYMBOL, position });
  return <span className={className}>{text}</span>;
}

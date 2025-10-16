import SARIcon from "./icons/SAR";
import { formatSAR, CURRENCY_SYMBOL } from "../lib/currency";

export default function Currency({ amount, locale, position, className }: { amount: number; locale?: string; position?: 'prefix' | 'suffix'; className?: string }) {
  const text = formatSAR(amount, { locale, symbol: CURRENCY_SYMBOL, position });
  // When using the icon, we don't actually show the symbol text; we render the figure and the icon.
  const showPrefix = (position || 'suffix') === 'prefix';
  const parts = new Intl.NumberFormat(locale || 'ar-SA', { maximumFractionDigits: 0 }).format(Number(amount || 0));
  return (
    <span className={`inline-flex items-baseline gap-1 ${className || ''}`}>
      {showPrefix ? (<><SARIcon className="w-3.5 h-3.5" /><span>{parts}</span></>) : (<><span>{parts}</span><SARIcon className="w-3.5 h-3.5" /></>) }
    </span>
  );
}


import type { SVGProps } from "react";

export default function SARIcon({ className = "w-4 h-4", strokeWidth = 2, ...rest }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}>
      {/* Simplified SAMA SAR symbol (stylized) */}
      <path d="M8 3v14" />
      <path d="M14 3v14" />
      <path d="M3.5 9.5 L20.5 7.5" />
      <path d="M4 13 L19.5 11" />
      <path d="M5 16.5 L18.5 14.5" />
    </svg>
  );
}


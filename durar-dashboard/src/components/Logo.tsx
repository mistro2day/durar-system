export default function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <img
      src="/logo-durar.svg"
      alt="درر العقارية — Durar Real Estate"
      className={className}
      loading="eager"
    />
  );
}


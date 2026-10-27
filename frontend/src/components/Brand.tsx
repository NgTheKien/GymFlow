export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00d95b" />
          <stop offset="1" stopColor="#00b24b" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#bm)" />
      <path d="M11 15v10M29 15v10M14.5 12.5v15M25.5 12.5v15M14.5 20h11" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M31 6 25 34" stroke="#fff" strokeOpacity=".18" strokeWidth="4" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <BrandMark />
      <div className="brand-name">Gym<b>Flow</b></div>
    </div>
  );
}

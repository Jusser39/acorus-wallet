type AcorusMageProps = {
  compact?: boolean;
  className?: string;
};

const ORBIT_TOKENS = [
  { symbol: "BTC", className: "acorus-mage__token--btc" },
  { symbol: "ETH", className: "acorus-mage__token--eth" },
  { symbol: "SOL", className: "acorus-mage__token--sol" },
  { symbol: "USDC", className: "acorus-mage__token--usdc" },
];

export function AcorusMage({ compact = false, className = "" }: AcorusMageProps) {
  return (
    <div
      className={`acorus-mage ${compact ? "acorus-mage--compact" : ""} ${className}`}
      aria-label="Acorus magic wallet guardian"
    >
      <div className="acorus-mage__halo" />
      <svg
        className="acorus-mage__figure"
        viewBox="0 0 360 520"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="acorusFace" cx="50%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#fff9ff" />
            <stop offset="48%" stopColor="#c7f7ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
          <linearGradient id="acorusRobe" x1="28%" x2="76%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#7cf7ff" />
            <stop offset="46%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ff7adf" />
          </linearGradient>
          <linearGradient id="acorusStaff" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="50%" stopColor="#ff7adf" />
            <stop offset="100%" stopColor="#7cf7ff" />
          </linearGradient>
          <filter id="acorusGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.48 0 0 0 0 0.96 0 0 0 0 1 0 0 0 0.7 0"
            />
            <feBlend in="SourceGraphic" mode="screen" />
          </filter>
        </defs>

        <path
          d="M81 438c14-90 45-145 99-145s85 55 99 145c-46 33-151 33-198 0Z"
          fill="url(#acorusRobe)"
          opacity="0.96"
        />
        <path
          d="M105 430c22-62 47-93 75-93s53 31 75 93c-37 20-113 20-150 0Z"
          fill="#081b3a"
          opacity="0.34"
        />
        <path
          d="M110 207c-14 40-40 74-75 103 28 10 59 8 90-5"
          fill="none"
          stroke="url(#acorusRobe)"
          strokeLinecap="round"
          strokeWidth="22"
        />
        <path
          d="M250 207c14 40 40 74 75 103-28 10-59 8-90-5"
          fill="none"
          stroke="url(#acorusRobe)"
          strokeLinecap="round"
          strokeWidth="22"
        />
        <path
          d="M84 188c26-47 58-71 96-71s70 24 96 71c-28 36-60 54-96 54s-68-18-96-54Z"
          fill="url(#acorusRobe)"
        />
        <circle cx="180" cy="160" r="57" fill="url(#acorusFace)" />
        <path
          d="M113 124c23-42 46-63 68-63 10 26 5 46-16 59 24-20 55-24 93-13-6 25-22 40-47 45 22 1 39 10 51 27-36 10-72 8-107-6-22-9-36-25-42-49Z"
          fill="url(#acorusRobe)"
          filter="url(#acorusGlow)"
        />
        <circle cx="158" cy="164" r="8" fill="#07172c" />
        <circle cx="202" cy="164" r="8" fill="#07172c" />
        <path d="M162 194c12 10 24 10 36 0" fill="none" stroke="#07172c" strokeLinecap="round" strokeWidth="6" />

        <path
          d="M87 414C60 364 72 301 123 225"
          fill="none"
          stroke="url(#acorusStaff)"
          strokeLinecap="round"
          strokeWidth="10"
        />
        <circle cx="122" cy="224" r="28" fill="#7cf7ff" opacity="0.34" />
        <circle cx="122" cy="224" r="14" fill="#ffffff" filter="url(#acorusGlow)" />

        <circle cx="180" cy="300" r="56" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.7)" />
        <text x="180" y="319" textAnchor="middle" fontSize="66" fontWeight="900" fill="#ffffff">
          A
        </text>
      </svg>

      <div className="acorus-mage__ring" />
      {ORBIT_TOKENS.map((token) => (
        <span key={token.symbol} className={`acorus-mage__token ${token.className}`}>
          {token.symbol}
        </span>
      ))}
    </div>
  );
}

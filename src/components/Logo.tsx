/** The mark: a model on its orbit, with two releases travelling around it. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d1c6ff" />
          <stop offset="0.5" stopColor="#8b7bff" />
          <stop offset="1" stopColor="#4d8dff" />
        </linearGradient>
        <radialGradient id="logo-core">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#b9adff" />
          <stop offset="1" stopColor="#6f6cff" />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="13" ry="6.5" transform="rotate(-28 16 16)" fill="none" stroke="url(#logo-gradient)" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="4.6" fill="url(#logo-core)" />
      <circle cx="27.5" cy="9.9" r="2.4" fill="#2fe0a8" />
      <circle cx="4.5" cy="22.1" r="2" fill="#ff8a47" />
    </svg>
  );
}

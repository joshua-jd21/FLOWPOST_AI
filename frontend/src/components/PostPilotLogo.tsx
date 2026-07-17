import './PostPilotLogo.css'

function PostPilotLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`postpilot-logo ${className}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <defs>
          <linearGradient id="postpilot-logo-gradient" x1="10" x2="56" y1="8" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.5" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
          <radialGradient id="postpilot-logo-shine" cx="22" cy="15" r="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="postpilot-logo-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <rect className="logo-glass-base" x="6" y="6" width="52" height="52" rx="19" />
        <circle className="logo-ambient logo-ambient-blue" cx="22" cy="20" r="15" filter="url(#postpilot-logo-blur)" />
        <circle className="logo-ambient logo-ambient-pink" cx="43" cy="43" r="16" filter="url(#postpilot-logo-blur)" />
        <rect x="6" y="6" width="52" height="52" rx="19" fill="url(#postpilot-logo-shine)" />
        <path className="logo-arc" d="M15 40c8.8-13.8 24.5-20.2 38-15.2" />
        <path className="logo-arc secondary" d="M18 49c6.8-7.5 17.2-12 31-13.4" />
        <path className="logo-spark-main" d="M32 13l4.7 13.3L50 31l-13.3 4.7L32 49l-4.7-13.3L14 31l13.3-4.7L32 13Z" />
        <path className="logo-spark-cut" d="M32 22.5 34.9 29 41.5 31 34.9 33 32 39.5 29.1 33 22.5 31 29.1 29 32 22.5Z" />
        <circle className="logo-node" cx="49" cy="25" r="3.2" />
        <circle className="logo-mini-node" cx="18" cy="42" r="2.1" />
        <circle className="logo-mini-node" cx="46" cy="40" r="2.1" />
      </svg>
    </span>
  )
}

export default PostPilotLogo

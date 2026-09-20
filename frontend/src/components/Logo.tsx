import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 26, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-xs ${className}`}
    >
      <defs>
        <linearGradient id="rs-gem-grad-1" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="rs-gem-grad-top" x1="9" y1="4" x2="23" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
        <linearGradient id="rs-gem-grad-center" x1="16" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {/* Gem Top Facet */}
      <polygon
        points="9,5 23,5 28,12 4,12"
        fill="url(#rs-gem-grad-top)"
      />
      {/* Gem Top Highlights */}
      <polygon
        points="9,5 16,12 23,5"
        fill="#FECACA"
        opacity="0.6"
      />
      <polygon
        points="4,12 9,5 16,12"
        fill="#F87171"
        opacity="0.8"
      />
      <polygon
        points="28,12 23,5 16,12"
        fill="#DC2626"
        opacity="0.85"
      />

      {/* Gem Lower Body */}
      <polygon
        points="4,12 28,12 16,28"
        fill="url(#rs-gem-grad-center)"
      />
      {/* Lower Left Facet */}
      <polygon
        points="4,12 16,12 16,28"
        fill="#DC2626"
        opacity="0.9"
      />
      {/* Lower Right Facet */}
      <polygon
        points="16,12 28,12 16,28"
        fill="#991B1B"
        opacity="0.85"
      />
      {/* Center Shine Line */}
      <line
        x1="16"
        y1="5"
        x2="16"
        y2="28"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeOpacity="0.3"
      />
    </svg>
  );
};

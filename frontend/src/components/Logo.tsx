import React from 'react';
import logoLight from '@assets/logo-light.svg?inline';
import logoDark from '@assets/logo-dark.svg?inline';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '' }) => {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} aria-hidden>
      <img
        src={logoLight}
        width={size}
        height={size}
        alt=""
        className="block dark:hidden object-contain"
      />
      <img
        src={logoDark}
        width={size}
        height={size}
        alt=""
        className="hidden dark:block object-contain"
      />
    </span>
  );
};

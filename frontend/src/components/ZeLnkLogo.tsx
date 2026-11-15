import React from 'react';

interface ZeLnkLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  useImage?: boolean;
}

export const ZeLnkLogo: React.FC<ZeLnkLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  useImage = false,
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const imageSizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-14',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  if (useImage) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <img
          src="/zelnk-logo.jpg"
          alt="ZeLnk Logo"
          className={`${imageSizes[size]} w-auto object-contain rounded-lg drop-shadow-sm`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* ZeLnk Stylized Vector Icon matching uploaded brand mark */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm transition-transform hover:scale-105"
        >
          <defs>
            <linearGradient id="zelnkGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="zelnkGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>
          </defs>

          {/* Top Bar of Z */}
          <path
            d="M20 24H82C84.2 24 85.5 26.5 84.2 28.3L64 54H32L46 36H20C17.8 36 17.8 24 20 24Z"
            fill="url(#zelnkGrad1)"
          />

          {/* Dynamic Link Swoosh Orbit */}
          <path
            d="M12 60C10 50 16 38 28 32C32 30 36 32 34 35C26 40 22 48 24 56C26 62 31 66 38 66C52 66 68 52 76 44C80 40 84 44 80 48C70 58 54 74 36 74C23 74 14 68 12 60Z"
            fill="url(#zelnkGrad2)"
          />

          {/* Bottom Bar of Z */}
          <path
            d="M36 50L20 72C18.5 74 20 76 22.5 76H82C84.2 76 84.2 64 82 64H52L68 50H36Z"
            fill="url(#zelnkGrad1)"
          />

          {/* Central Loop Node */}
          <ellipse
            cx="48"
            cy="52"
            rx="6"
            ry="4"
            transform="rotate(-25 48 52)"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* Styled ZeLnk Typography */}
      {showText && (
        <span className={`font-extrabold tracking-tight ${textSizes[size]} leading-none`}>
          <span className="text-slate-900 dark:text-white">Ze</span>
          <span className="text-blue-600 dark:text-blue-400">L</span>
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            nk
          </span>
        </span>
      )}
    </div>
  );
};

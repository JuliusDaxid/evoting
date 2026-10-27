import React, { useState } from 'react';

// Official inline SVG Data URI for eOSIS emblem
// 100% self-contained, no external network requests, zero latency, guaranteed to always load.
export const OFFICIAL_EOSIS_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231e3a8a"/>
      <stop offset="50%" stop-color="%232563eb"/>
      <stop offset="100%" stop-color="%230f172a"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23fbbf24"/>
      <stop offset="50%" stop-color="%23f59e0b"/>
      <stop offset="100%" stop-color="%23d97706"/>
    </linearGradient>
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="%23dc2626"/>
      <stop offset="50%" stop-color="%23ea580c"/>
      <stop offset="100%" stop-color="%23facc15"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="%23000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Outer Shield Crest -->
  <path d="M 80 8 Q 128 8 138 36 Q 146 92 80 152 Q 14 92 22 36 Q 32 8 80 8 Z" 
        fill="url(%23bgGrad)" 
        stroke="url(%23goldGrad)" 
        stroke-width="4.5" 
        filter="url(%23glow)"/>

  <!-- Inner Gold Border Ring -->
  <path d="M 80 16 Q 120 16 128 40 Q 134 88 80 142 Q 26 88 32 40 Q 40 16 80 16 Z" 
        fill="none" 
        stroke="%23fbbf24" 
        stroke-width="1.5" 
        stroke-opacity="0.6"/>

  <!-- Stylized OSIS Wings Left -->
  <path d="M 80 88 C 65 72, 44 76, 36 94 C 48 94, 60 90, 80 102 Z" fill="%23f1f5f9" opacity="0.95"/>
  <path d="M 80 78 C 66 64, 48 68, 42 82 C 52 82, 64 78, 80 90 Z" fill="url(%23goldGrad)"/>
  <path d="M 80 68 C 68 56, 52 58, 48 70 C 58 70, 68 66, 80 78 Z" fill="%23f1f5f9" opacity="0.95"/>

  <!-- Stylized OSIS Wings Right -->
  <path d="M 80 88 C 95 72, 116 76, 124 94 C 112 94, 100 90, 80 102 Z" fill="%23f1f5f9" opacity="0.95"/>
  <path d="M 80 78 C 94 64, 112 68, 118 82 C 108 82, 96 78, 80 90 Z" fill="url(%23goldGrad)"/>
  <path d="M 80 68 C 92 56, 108 58, 112 70 C 102 70, 92 66, 80 78 Z" fill="%23f1f5f9" opacity="0.95"/>

  <!-- Open Book of Knowledge -->
  <path d="M 80 114 C 70 108, 54 108, 46 116 L 46 100 C 56 94, 70 94, 80 100 Z" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="0.8"/>
  <path d="M 80 114 C 90 108, 106 108, 114 116 L 114 100 C 104 94, 90 94, 80 100 Z" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="0.8"/>
  <line x1="80" y1="100" x2="80" y2="114" stroke="%2394a3b8" stroke-width="1.5"/>

  <!-- Torch / Flame of Spirit -->
  <path d="M 80 34 C 86 44, 94 52, 88 64 C 84 58, 82 54, 80 50 C 78 54, 76 58, 72 64 C 66 52, 74 44, 80 34 Z" 
        fill="url(%23flameGrad)" 
        filter="url(%23glow)"/>
  <circle cx="80" cy="56" r="4" fill="%23fef08a"/>
  <path d="M 76 64 L 84 64 L 82 74 L 78 74 Z" fill="url(%23goldGrad)"/>

  <!-- Top Star -->
  <polygon points="80,18 82.5,24 88.5,24.5 84,28.5 85.5,34.5 80,31 74.5,34.5 76,28.5 71.5,24.5 77.5,24" fill="%23fef08a" stroke="%23b45309" stroke-width="0.5"/>

  <!-- Digital Election Ribbon -->
  <path d="M 42 126 L 118 126 L 112 136 L 48 136 Z" fill="%230f172a" stroke="url(%23goldGrad)" stroke-width="1.2"/>
  <text x="80" y="134" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="900" font-size="8.5" fill="%23fef08a" text-anchor="middle" letter-spacing="1.5">eOSIS</text>
</svg>`;

interface EosisLogoProps {
  logoUrl?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const EosisLogo: React.FC<EosisLogoProps> = ({
  logoUrl,
  alt = 'Logo eOSIS',
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // If a custom logo URL is provided (not the old broken unsplash link) and hasn't errored
  const isBrokenUnsplash =
    typeof logoUrl === 'string' &&
    (logoUrl.includes('images.unsplash.com/photo-1546410531-bb4caa6b424d') ||
      logoUrl.trim() === '');

  const hasValidCustomUrl = Boolean(logoUrl && !isBrokenUnsplash && !imageError);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-18 h-18 sm:w-20 sm:h-20',
  };

  if (hasValidCustomUrl) {
    return (
      <img
        src={logoUrl!}
        alt={alt}
        className={`${sizeClasses[size]} object-contain rounded-xl ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Guaranteed vector SVG logo fallback - will ALWAYS display perfectly
  return (
    <img
      src={OFFICIAL_EOSIS_LOGO_SVG}
      alt={alt}
      className={`${sizeClasses[size]} object-contain drop-shadow-xs select-none ${className}`}
      draggable={false}
    />
  );
};

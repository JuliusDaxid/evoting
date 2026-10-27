import React, { useState } from 'react';

// Official OSIS Emblem image provided for SMPN 1 Dayun
export const OFFICIAL_EOSIS_LOGO =
  '/assets/aistudio/Biru_Simpel_Logo_Kelas_Sekolah-removebg-preview_09a3b67f.png';

// Retain alias for any existing code imports
export const OFFICIAL_EOSIS_LOGO_SVG = OFFICIAL_EOSIS_LOGO;

interface EosisLogoProps {
  logoUrl?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const EosisLogo: React.FC<EosisLogoProps> = ({
  logoUrl,
  alt = 'Logo Resmi OSIS SMPN 1 Dayun',
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // If a custom logo URL is provided (not broken unsplash, not empty, and not the old generic svg data URI)
  const isOldPlaceholder =
    typeof logoUrl === 'string' &&
    (logoUrl.includes('images.unsplash.com/photo-1546410531-bb4caa6b424d') ||
      logoUrl.startsWith('data:image/svg+xml') ||
      logoUrl.trim() === '');

  const customLogoUrl = logoUrl && !isOldPlaceholder && !imageError ? logoUrl : OFFICIAL_EOSIS_LOGO;

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20 sm:w-24 sm:h-24',
  };

  return (
    <img
      src={customLogoUrl}
      alt={alt}
      className={`${sizeClasses[size]} object-contain select-none transition-transform duration-200 hover:scale-105 ${className}`}
      draggable={false}
      onError={() => {
        if (!imageError && customLogoUrl !== OFFICIAL_EOSIS_LOGO) {
          setImageError(true);
        }
      }}
    />
  );
};


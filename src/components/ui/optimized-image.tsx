import React, { useState, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  fallbackSrc?: string;
  className?: string;
  showBlurPlaceholder?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
  fallbackSrc = '/images/placeholder.png',
  className = '',
  showBlurPlaceholder = false,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleError = () => {
    setImageError(true);
  };

  const handleLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {showBlurPlaceholder && !imageLoaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      <img
        src={imageError ? fallbackSrc : src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onError={handleError}
        onLoad={handleLoad}
        className={`${className} ${!imageLoaded && showBlurPlaceholder ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        {...props}
      />
    </div>
  );
}

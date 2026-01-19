import { useState, useEffect, useRef, ImgHTMLAttributes, memo } from "react";
import styles from "./LazyImage.module.css";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  fallbackSrc?: string;
}

export const LazyImage = memo<LazyImageProps>(function LazyImage({
  src,
  alt,
  placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ELoading...%3C/text%3E%3C/svg%3E',
  fallbackSrc = placeholderSrc,
  className,
  onError,
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver;

    // Reset state when a new image is requested.
    setIsLoaded(false);
    setImageSrc(placeholderSrc);

    if (imgRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: "50px",
        },
      );

      observer.observe(imgRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [src, placeholderSrc]);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    // If the real image fails, swap to a safe fallback.
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setIsLoaded(true);
    }

    onError?.(event);
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={[
        styles.image,
        isLoaded ? styles.loaded : "",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
      {...props}
    />
  );
});

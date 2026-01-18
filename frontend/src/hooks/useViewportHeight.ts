import { useEffect } from 'react';

/**
 * Fixes mobile browser 100vh issues by exposing the real viewport height as a CSS variable.
 *
 * Usage in CSS:
 *   min-height: var(--app-height, 100vh);
 */
export function useViewportHeightCssVar(): void {
  useEffect(() => {
    const setAppHeight = () => {
      // Use innerHeight (visual viewport height) to avoid extra whitespace caused by mobile browser UI.
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    setAppHeight();

    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);
}

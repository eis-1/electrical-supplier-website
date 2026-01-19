import { useEffect } from "react";

/**
 * Keeps a CSS variable in sync with the visible navbar offset from the top.
 *
 * Why: our navbar is sometimes `fixed` with a non-zero `top` (mobile), and can
 * change height (scroll state / responsive wrapping). Pages use `--navbar-height`
 * for top padding, so we compute the *bottom edge* of the navbar in the viewport.
 */
export function useNavbarHeightCssVar(
  navRef: React.RefObject<HTMLElement>,
  deps: readonly unknown[] = [],
  cssVarName = "--navbar-height",
): void {
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    let rafId = 0;

    const update = () => {
      // Use the bottom edge so we include any top offset (e.g. mobile `top: 12px`).
      const rect = el.getBoundingClientRect();
      const bottom = Math.max(0, Math.ceil(rect.bottom));
      document.documentElement.style.setProperty(cssVarName, `${bottom}px`);
    };

    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    scheduleUpdate();

    const onResize = () => scheduleUpdate();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // ResizeObserver catches CSS-driven size changes (e.g. scrolled padding, wrap).
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => scheduleUpdate());
      ro.observe(el);
    }

    // Some browsers can change the visual viewport without firing a normal resize.
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onResize);
      vv.addEventListener("scroll", onResize);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (vv) {
        vv.removeEventListener("resize", onResize);
        vv.removeEventListener("scroll", onResize);
      }
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

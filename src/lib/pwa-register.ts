/**
 * Register the minimal PWA service worker (public/sw.js) when available.
 * Safe no-op on unsupported browsers / non-secure contexts (except localhost).
 */
export function registerPwaServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";
  const isSecure = window.isSecureContext || isLocal;
  if (!isSecure) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Non-fatal — installability still works via manifest + icons
      console.info("[pwa] service worker registration skipped:", err);
    });
  });
}

/**
 * Register the strengthened PWA service worker (public/sw.js).
 * Safe no-op on unsupported browsers / non-secure contexts (except localhost).
 * Detects updates and activates the new worker as soon as possible.
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
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Prefer the new worker as soon as it installs
        if (registration.waiting) {
          registration.waiting.postMessage?.({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — next navigation/reload picks it up
              console.info("[pwa] Updated service worker available");
            }
          });
        });
      })
      .catch((err) => {
        // Non-fatal — installability still works via manifest + icons
        console.info("[pwa] service worker registration skipped:", err);
      });

    // Reload once when the controlling SW changes (after skipWaiting/claim)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      // Optional: soft reload so users get the new shell without a manual refresh
      // window.location.reload();
    });
  });
}

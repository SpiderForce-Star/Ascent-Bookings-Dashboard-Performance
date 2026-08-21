import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "ascent-pwa-install-dismissed";

const STANDALONE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
] as const;

export type PwaInstallOutcome = "accepted" | "dismissed" | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export interface PwaInstall {
  isStandalone: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  /** True after a successful native install (this session or `appinstalled`). */
  installed: boolean;
  install: () => Promise<PwaInstallOutcome>;
  dismissed: boolean;
  dismissForever: () => void;
}

let sharedPrompt: BeforeInstallPromptEvent | null = null;
let appWasInstalled = false;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();
const installedListeners = new Set<() => void>();
let captureBound = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getNavigator(): NavigatorWithStandalone | null {
  if (!isBrowser()) return null;
  return window.navigator as NavigatorWithStandalone;
}

function detectStandalone(): boolean {
  if (!isBrowser()) return false;
  const nav = getNavigator();
  if (nav?.standalone === true) return true;
  return STANDALONE_QUERIES.some((query) => window.matchMedia(query).matches);
}

function detectIOS(): boolean {
  const nav = getNavigator();
  if (!nav) return false;
  const ua = nav.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh with touch
  return /Macintosh/i.test(ua) && nav.maxTouchPoints > 1;
}

function detectAndroid(): boolean {
  const nav = getNavigator();
  if (!nav) return false;
  return /Android/i.test(nav.userAgent);
}

function readDismissed(): boolean {
  if (!isBrowser()) return false;
  try {
    const value = window.localStorage.getItem(DISMISS_KEY);
    return value === "true" || value === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DISMISS_KEY, "true");
  } catch {
    // Private mode / blocked storage — caller still updates React state
  }
}

function bindPromptCapture(): void {
  if (captureBound || !isBrowser()) return;
  captureBound = true;

  window.addEventListener("beforeinstallprompt", (event: Event) => {
    event.preventDefault();
    const promptEvent = event as BeforeInstallPromptEvent;
    sharedPrompt = promptEvent;
    promptListeners.forEach((fn) => fn(promptEvent));
  });

  window.addEventListener("appinstalled", () => {
    appWasInstalled = true;
    sharedPrompt = null;
    promptListeners.forEach((fn) => fn(null));
    installedListeners.forEach((fn) => fn());
  });
}

bindPromptCapture();

export function usePwaInstall(): PwaInstall {
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    bindPromptCapture();

    setIsStandalone(detectStandalone());
    setIsIOS(detectIOS());
    setIsAndroid(detectAndroid());
    setDismissed(readDismissed() || appWasInstalled);
    setCanInstall(sharedPrompt !== null);
    if (appWasInstalled) setInstalled(true);

    const onPrompt = (prompt: BeforeInstallPromptEvent | null) => {
      setCanInstall(prompt !== null);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      setIsStandalone(detectStandalone());
      writeDismissed();
      setDismissed(true);
    };

    promptListeners.add(onPrompt);
    installedListeners.add(onInstalled);

    const media = STANDALONE_QUERIES.map((query) => window.matchMedia(query));
    const onDisplayMode = () => setIsStandalone(detectStandalone());
    media.forEach((mq) => mq.addEventListener("change", onDisplayMode));

    return () => {
      promptListeners.delete(onPrompt);
      installedListeners.delete(onInstalled);
      media.forEach((mq) => mq.removeEventListener("change", onDisplayMode));
    };
  }, []);

  const install = useCallback(async (): Promise<PwaInstallOutcome> => {
    const promptEvent = sharedPrompt;
    if (!promptEvent) return "unavailable";

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      sharedPrompt = null;
      promptListeners.forEach((fn) => fn(null));
      setCanInstall(false);
      if (outcome === "accepted") {
        setInstalled(true);
        writeDismissed();
        setDismissed(true);
      }
      return outcome;
    } catch {
      return "unavailable";
    }
  }, []);

  const dismissForever = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  return {
    isStandalone,
    canInstall,
    isIOS,
    isAndroid,
    isDesktop: !isIOS && !isAndroid,
    installed,
    install,
    dismissed,
    dismissForever,
  };
}

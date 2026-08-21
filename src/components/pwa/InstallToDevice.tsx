import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  CircleCheck,
  Download,
  EllipsisVertical,
  House,
  Monitor,
  Smartphone,
  SquareArrowUp,
  SquarePlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const AUTO_OPEN_MS = 2200;

function isNonSafariIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(navigator.userAgent);
}

function isSafariDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
}

export function InstallToDevice() {
  const {
    isStandalone,
    canInstall,
    isIOS,
    isAndroid,
    isDesktop,
    installed,
    install,
    dismissed,
    dismissForever,
  } = usePwaInstall();

  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const interactedRef = useRef(false);

  const hideChrome = isStandalone || installed;

  useEffect(() => {
    if (hideChrome || dismissed || interactedRef.current) return;
    const id = window.setTimeout(() => {
      if (interactedRef.current || hideChrome) return;
      setOpen(true);
    }, AUTO_OPEN_MS);
    return () => window.clearTimeout(id);
  }, [hideChrome, dismissed]);

  useEffect(() => {
    if (installed) setSuccess(true);
  }, [installed]);

  useEffect(() => {
    if (!success || !open) return;
    const id = window.setTimeout(() => setOpen(false), 2800);
    return () => window.clearTimeout(id);
  }, [success, open]);

  if (isStandalone) return null;
  if (installed && !open) return null;

  function handleOpenChange(next: boolean) {
    interactedRef.current = true;
    if (!next) setSuccess(false);
    setOpen(next);
  }

  async function handleInstall() {
    setBusy(true);
    const outcome = await install();
    setBusy(false);
    if (outcome === "accepted") {
      setSuccess(true);
    }
  }

  function handleDismissForever() {
    interactedRef.current = true;
    dismissForever();
    setOpen(false);
  }

  return (
    <div className="pwa-install-ui print:hidden">
      {!installed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 whitespace-nowrap border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-fg)]"
          onClick={() => handleOpenChange(true)}
          aria-haspopup="dialog"
          aria-label="Download to Device"
        >
          <Download className="size-3.5" />
          Download to Device
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          aria-describedby="pwa-install-desc"
          className="max-h-[min(92dvh,640px)] overflow-y-auto"
        >
          {success ? (
            <SuccessState onDone={() => handleOpenChange(false)} />
          ) : (
            <>
              <DialogHeader>
                <div className="mb-1 flex items-center gap-3">
                  <img
                    src="/icons/icon-192.png"
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] object-cover"
                  />
                  <div className="min-w-0">
                    <DialogTitle>Install Ascent Dashboard</DialogTitle>
                  </div>
                </div>
                <DialogDescription id="pwa-install-desc">
                  Add it to your home screen or desktop for one-tap access, full-screen mode, and
                  offline use.
                </DialogDescription>
              </DialogHeader>

              <div className="min-w-0">
                {canInstall ? (
                  <NativeInstallBody
                    busy={busy}
                    isDesktop={isDesktop}
                    onInstall={() => void handleInstall()}
                  />
                ) : isIOS ? (
                  <IosInstallBody />
                ) : (
                  <FallbackInstallBody isAndroid={isAndroid} isDesktop={isDesktop} />
                )}
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={handleDismissForever}
                  className="text-left text-xs text-[var(--color-fg-subtle)] underline-offset-2 hover:text-[var(--color-fg-muted)] hover:underline"
                >
                  Don't show again
                </button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                  Maybe later
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuccessState({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
        <CircleCheck className="size-7" />
      </span>
      <DialogHeader className="pr-0">
        <DialogTitle>Installed</DialogTitle>
        <DialogDescription>
          Ascent Dashboard is on this device. Launch it from your home screen or desktop for
          full-screen access.
        </DialogDescription>
      </DialogHeader>
      <Button type="button" variant="secondary" size="sm" className="mt-1" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function NativeInstallBody({
  busy,
  isDesktop,
  onInstall,
}: {
  busy: boolean;
  isDesktop: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-3">
      <ul className="list-none space-y-2 p-0 text-sm text-[var(--color-fg-muted)]">
        <Benefit icon={isDesktop ? Monitor : Smartphone}>Opens full-screen, like a native app</Benefit>
        <Benefit icon={Download}>One tap from your {isDesktop ? "desktop" : "home screen"}</Benefit>
        <Benefit icon={CircleCheck}>Works offline on this device</Benefit>
      </ul>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={onInstall}
        disabled={busy}
        aria-label="Install App"
      >
        <Download className="size-4" />
        {busy ? "Waiting for browser…" : "Install App"}
      </Button>
    </div>
  );
}

function IosInstallBody() {
  const needsSafari = isNonSafariIOS();

  return (
    <div className="space-y-3">
      {needsSafari && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-warn)]/30 bg-[var(--color-warn-soft)] px-3 py-2 text-xs text-[var(--color-warn)]">
          Open this page in Safari first. Chrome and other browsers on iPhone cannot add Home Screen
          apps.
        </p>
      )}
      <ol className="list-none space-y-2.5 p-0">
        <Step n={1} icon={SquareArrowUp}>
          Tap the <strong className="font-semibold text-[var(--color-fg)]">Share</strong> button
          (square with an upward arrow) in the Safari toolbar
        </Step>
        <Step n={2} icon={SquarePlus}>
          Scroll down and tap{" "}
          <strong className="font-semibold text-[var(--color-fg)]">Add to Home Screen</strong>
        </Step>
        <Step n={3} icon={Check}>
          Tap <strong className="font-semibold text-[var(--color-fg)]">Add</strong>
        </Step>
      </ol>
      <p className="flex items-start gap-2 text-xs text-[var(--color-fg-muted)]">
        <House className="mt-0.5 size-3.5 shrink-0 text-[var(--color-primary)]" />
        This places the Ascent Dashboard icon on your Home Screen.
      </p>
    </div>
  );
}

function FallbackInstallBody({ isAndroid, isDesktop }: { isAndroid: boolean; isDesktop: boolean }) {
  if (isAndroid) {
    return (
      <div className="space-y-3 text-sm text-[var(--color-fg-muted)]">
        <p>Install from the Chrome menu:</p>
        <ol className="list-none space-y-2.5 p-0">
          <Step n={1} icon={EllipsisVertical}>
            Tap the <strong className="font-semibold text-[var(--color-fg)]">⋮</strong> menu in the
            top-right
          </Step>
          <Step n={2} icon={Download}>
            Tap <strong className="font-semibold text-[var(--color-fg)]">Install app</strong> or{" "}
            <strong className="font-semibold text-[var(--color-fg)]">Add to Home screen</strong>
          </Step>
        </ol>
      </div>
    );
  }

  if (isDesktop && isSafariDesktop()) {
    return (
      <p className="text-sm text-[var(--color-fg-muted)]">
        In Safari, choose <strong className="font-semibold text-[var(--color-fg)]">File → Add to Dock</strong>{" "}
        (or Share → Add to Dock) to open Ascent Dashboard as its own app.
      </p>
    );
  }

  return (
    <p className="text-sm text-[var(--color-fg-muted)]">
      Look for the install icon in the address bar or browser menu.
    </p>
  );
}

function Benefit({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="size-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function Step({ n, icon: Icon, children }: { n: number; icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-[var(--color-primary-fg)]"
        aria-hidden
      >
        {n}
      </span>
      <span className="min-w-0 flex-1 pt-0.5 text-sm leading-snug text-[var(--color-fg-muted)]">
        {children}
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="size-4" />
      </span>
    </li>
  );
}

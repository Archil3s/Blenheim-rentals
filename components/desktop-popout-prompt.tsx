"use client";

import { useEffect, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isDesktop() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 799px)").matches;
  return !coarsePointer && !narrow;
}

export function DesktopPopoutPrompt() {
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [manualHelp, setManualHelp] = useState(false);

  useEffect(() => {
    if (!isDesktop() || isStandalone()) return;
    if (sessionStorage.getItem("rental-finder-desktop-popout-dismissed") === "1") return;

    const showTimer = window.setTimeout(() => setVisible(true), 900);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem("rental-finder-desktop-popout-dismissed", "1");
    setVisible(false);
  };

  const installApp = async () => {
    if (!installPrompt) {
      setManualHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setInstallPrompt(null);
  };

  return (
    <aside
      className="install-prompt desktop-popout-prompt"
      role="dialog"
      aria-label="Install Rental Finder without a URL bar"
    >
      <button
        type="button"
        className="install-prompt-close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>

      <div className="install-prompt-copy">
        <strong>Use Rental Finder without a URL bar</strong>
        <span>
          PC only · install it as an app and it will open in its own standalone window.
        </span>
      </div>

      <button type="button" className="install-prompt-action" onClick={() => void installApp()}>
        {installPrompt ? "Install app — no URL bar" : "How to install app"}
      </button>

      {manualHelp && (
        <div className="install-prompt-steps">
          <span><b>Chrome:</b> use the Install icon in the address bar or browser menu → Install Rental Finder.</span>
          <span><b>Edge:</b> menu → Apps → Install this site as an app.</span>
          <small>After installation, open Rental Finder from its desktop/Start menu app icon. The normal URL bar is not shown.</small>
        </div>
      )}
    </aside>
  );
}

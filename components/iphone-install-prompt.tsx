"use client";

import { useEffect, useState } from "react";

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIphoneLike() {
  const ua = navigator.userAgent;
  const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPod/i.test(ua) || touchMac;
}

export function IphoneInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isIphoneLike() || isStandalone()) return;
    if (sessionStorage.getItem("rental-finder-install-prompt-dismissed") === "1") return;

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem("rental-finder-install-prompt-dismissed", "1");
    setVisible(false);
  };

  return (
    <aside className="install-prompt" role="dialog" aria-label="Open Rental Finder full screen">
      <button
        type="button"
        className="install-prompt-close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>

      <div className="install-prompt-copy">
        <strong>Open without Safari bars</strong>
        <span>Add Rental Finder to your Home Screen to launch it like an app.</span>
      </div>

      {!expanded ? (
        <button type="button" className="install-prompt-action" onClick={() => setExpanded(true)}>
          Open full-screen
        </button>
      ) : (
        <div className="install-prompt-steps">
          <span><b>1.</b> Tap Safari&apos;s Share button ⬆</span>
          <span><b>2.</b> Tap <b>Add to Home Screen</b></span>
          <span><b>3.</b> Open <b>Rental Finder</b> from the new icon</span>
          <small>It will then launch standalone without Safari&apos;s URL/navigation bars.</small>
        </div>
      )}
    </aside>
  );
}

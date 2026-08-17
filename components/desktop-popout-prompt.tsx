"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!isDesktop() || isStandalone()) return;
    if (sessionStorage.getItem("rental-finder-desktop-popout-dismissed") === "1") return;

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem("rental-finder-desktop-popout-dismissed", "1");
    setVisible(false);
  };

  const openAppWindow = () => {
    const width = Math.min(1440, Math.max(1000, window.screen.availWidth - 120));
    const height = Math.min(1000, Math.max(720, window.screen.availHeight - 100));
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));

    const popup = window.open(
      window.location.href,
      "RentalFinderApp",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (popup) {
      popup.focus();
      dismiss();
    }
  };

  return (
    <aside className="install-prompt desktop-popout-prompt" role="dialog" aria-label="Open Rental Finder in its own window">
      <button
        type="button"
        className="install-prompt-close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>

      <div className="install-prompt-copy">
        <strong>Open Rental Finder in its own window</strong>
        <span>PC only · opens a clean separate app-style window.</span>
      </div>

      <button type="button" className="install-prompt-action" onClick={openAppWindow}>
        Open app window
      </button>
    </aside>
  );
}

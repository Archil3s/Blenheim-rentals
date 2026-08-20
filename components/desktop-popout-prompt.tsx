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

export function DesktopPopoutPrompt() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setOpen(false);
    setInstallPrompt(null);
  };

  return (
    <>
      {!open && (
        <button type="button" className="install-launcher" onClick={() => setOpen(true)}>
          ＋ Install app
        </button>
      )}

      {open && (
        <aside className="install-prompt" role="dialog" aria-label="Install Rental Finder">
          <button
            type="button"
            className="install-prompt-close"
            aria-label="Close install help"
            onClick={() => setOpen(false)}
          >
            ×
          </button>

          <div className="install-prompt-copy">
            <strong>Install Rental Finder</strong>
            <span>Add it to your home screen or desktop for quicker access.</span>
          </div>

          {installPrompt ? (
            <button type="button" className="install-prompt-action" onClick={() => void installApp()}>
              Install Rental Finder
            </button>
          ) : (
            <div className="install-prompt-steps">
              <span><b>iPhone/iPad:</b> Safari → Share → Add to Home Screen.</span>
              <span><b>Android:</b> browser menu → Install app or Add to Home screen.</span>
              <span><b>Computer:</b> Chrome/Edge install icon or browser menu → Install app.</span>
              <small>The website works normally without installation.</small>
            </div>
          )}
        </aside>
      )}
    </>
  );
}

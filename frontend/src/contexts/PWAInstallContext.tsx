import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwa_install_prompt: BeforeInstallPromptEvent | null;
  }
}

interface PWAInstallContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<void>;
}

const PWAInstallContext = createContext<PWAInstallContextValue>({
  canInstall: false,
  isInstalled: false,
  triggerInstall: async () => {},
});

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Pick up event captured before React mounted
    if (window.__pwa_install_prompt) {
      setDeferredPrompt(window.__pwa_install_prompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      window.__pwa_install_prompt = evt;
      setDeferredPrompt(evt);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect when app gets installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwa_install_prompt = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      window.__pwa_install_prompt = null;
    }
  };

  return (
    <PWAInstallContext.Provider
      value={{ canInstall: !!deferredPrompt, isInstalled, triggerInstall }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
}

export const usePWAInstall = () => useContext(PWAInstallContext);

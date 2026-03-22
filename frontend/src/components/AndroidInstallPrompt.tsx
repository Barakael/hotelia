import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/contexts/PWAInstallContext";

const SESSION_KEY = "android_install_prompt_dismissed";

export function AndroidInstallPrompt() {
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    const alreadyDismissed = sessionStorage.getItem(SESSION_KEY);
    if (alreadyDismissed) return;
    if (canInstall) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  const handleInstall = async () => {
    await triggerInstall();
    setVisible(false);
  };

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="android-backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            key="android-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border border-white/20 bg-white/10 backdrop-blur-xl px-6 pb-10 pt-5 text-white shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/40" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#007AAD]">
                  <img
                    src="/icon-192x192.png"
                    alt="Hotelia"
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-white/50">
                    Install App
                  </p>
                  <h2 className="text-lg font-semibold leading-tight">
                    Hotelia
                  </h2>
                  <p className="text-xs text-white/50">
                    Add to your Home Screen
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="ml-4 rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            {/* Benefits */}
            <div className="mb-6 space-y-3">
              <BenefitRow
                icon={<Smartphone size={16} className="text-[#007AAD]" />}
                text="Instant access — works like a native app, no browser bar"
              />
              <BenefitRow
                icon={<Download size={16} className="text-[#007AAD]" />}
                text="Loads instantly, even on slow connections"
              />
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              className="w-full rounded-2xl bg-[#007AAD] py-3.5 text-center text-sm font-bold text-[#0C1D32] shadow-lg active:scale-95 transition-transform"
            >
              Install Hotelia
            </button>

            <button
              onClick={dismiss}
              className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/60"
            >
              Maybe later
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function BenefitRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
      <div className="flex-shrink-0">{icon}</div>
      <p className="text-sm text-white/80">{text}</p>
    </div>
  );
}

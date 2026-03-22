import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";

const isIos = (): boolean => {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

const isInStandaloneMode = (): boolean =>
  "standalone" in window.navigator &&
  (window.navigator as Navigator & { standalone: boolean }).standalone === true;

const SESSION_KEY = "ios_install_prompt_dismissed";

export function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyDismissed = sessionStorage.getItem(SESSION_KEY);
    if (isIos() && !isInStandaloneMode() && !alreadyDismissed) {
      // Delay slightly so the page has loaded before showing
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

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
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border border-white/20 bg-white/10 backdrop-blur-xl px-6 pb-10 pt-5 text-white shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/40" />

            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/50">
                  Install App
                </p>
                <h2 className="mt-0.5 text-lg font-semibold">
                  Add Hotelia to your Home Screen
                </h2>
              </div>
              <button
                onClick={dismiss}
                className="ml-4 rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <Step
                number={1}
                icon={
                  <div className="relative flex items-center justify-center">
                    <Share
                      size={24}
                      className="share-bounce text-[#007AAD]"
                    />
                  </div>
                }
                label={
                  <>
                    Tap the{" "}
                    <span className="font-semibold text-[#007AAD]">Share</span>{" "}
                    button at the bottom of Safari
                  </>
                }
              />
              <Step
                number={2}
                icon={
                  <div className="flex items-center justify-center">
                    <Plus size={24} className="text-[#007AAD]" />
                  </div>
                }
                label={
                  <>
                    Tap{" "}
                    <span className="font-semibold text-[#007AAD]">
                      "Add to Home Screen"
                    </span>{" "}
                    from the menu
                  </>
                }
              />
            </div>

            {/* Visual animated hint */}
            <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-4">
              <PhoneShareAnimation />
              <div className="text-xs text-white/60 leading-relaxed max-w-[180px]">
                Scroll down in the share sheet to find{" "}
                <span className="text-white/90">"Add to Home Screen"</span>
              </div>
            </div>

            {/* Dismiss text */}
            <button
              onClick={dismiss}
              className="mt-5 w-full text-center text-xs text-white/40 hover:text-white/60"
            >
              Maybe later
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Step({
  number,
  icon,
  label,
}: {
  number: number;
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-bold text-white/80">
        {number}
      </div>
      <div className="flex-shrink-0">{icon}</div>
      <p className="text-sm leading-snug text-white/80">{label}</p>
    </div>
  );
}

function PhoneShareAnimation() {
  return (
    <div className="relative flex h-16 w-10 flex-shrink-0 items-end justify-center rounded-xl border border-white/20 bg-white/10">
      {/* Bottom bar representing iOS toolbar */}
      <div className="absolute bottom-2 flex w-8 items-center justify-center rounded-md bg-white/20 py-1">
        <Share size={12} className="share-pulse text-[#007AAD]" />
      </div>
      {/* Screen */}
      <div className="mb-6 h-5 w-7 rounded-sm bg-white/10" />
      {/* Animated arrow */}
      <motion.div
        className="absolute bottom-7 flex flex-col items-center"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M4 7V1M1 4l3-3 3 3" stroke="#007AAD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
  );
}

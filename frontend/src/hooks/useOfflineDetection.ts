import { useEffect } from "react";
import { toast } from "sonner";

const OFFLINE_TOAST_ID = "network-offline";

export function useOfflineDetection() {
  useEffect(() => {
    const handleOffline = () => {
      toast.error("You are currently offline", {
        id: OFFLINE_TOAST_ID,
        description: "Check your connection. Changes may not save.",
        duration: Infinity,
      });
    };

    const handleOnline = () => {
      toast.dismiss(OFFLINE_TOAST_ID);
      toast.success("Back online", {
        description: "Your connection has been restored.",
        duration: 3000,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state in case the page loaded while already offline
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}

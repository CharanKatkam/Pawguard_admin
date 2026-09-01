import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isSessionExpired, updateLastActivity, clearAuthData, getStoredUser } from "../utils/authStorage";
import { notifyAuthChanged } from "../utils/dataSync";
import { useToast } from "../context/ToastContext";

/**
 * Custom hook to monitor user inactivity for authenticated Admin sessions.
 * Enforces an exact 900-second (15 minute) inactivity timeout across all tabs.
 */
export const useInactivityTimeout = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const lastThrottleRef = useRef<number>(0);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;

    // Refresh lastActivity timestamp on actual user interaction (throttled to max 1 update per 30000ms)
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current > 30000) {
        lastThrottleRef.current = now;
        updateLastActivity();
      }
    };

    const events = ["click", "keydown", "pointerdown", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Check for 15-minute inactivity timeout every 1000ms
    const interval = setInterval(() => {
      if (getStoredUser() && isSessionExpired()) {
        clearAuthData();
        notifyAuthChanged();
        addToast("Your session has expired due to 15 minutes of inactivity. Please log in again.", "error");
        navigate("/", { replace: true });
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
    };
  }, [navigate, addToast]);
};

export default useInactivityTimeout;

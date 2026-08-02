import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const SPLASH_KEY = "matmama:splash-shown";

/**
 * Animated Matmama logo intro shown once per signed-in session,
 * right before the dashboard shell appears.
 */
export function LogoSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), 1500);
    const done = window.setTimeout(onDone, 2000);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute h-40 w-40 rounded-full bg-primary/10 animate-[pulse_1.8s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        <Logo className="relative h-24 w-auto animate-scale-in" />
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full origin-left animate-[scale-in_1.4s_ease-out_forwards] bg-primary" />
      </div>
      <p className="animate-fade-in text-sm text-muted-foreground">Preparing your workspace…</p>
    </div>
  );
}

export const useLogoSplash = (ready: boolean) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (sessionStorage.getItem(SPLASH_KEY)) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);
  }, [ready]);

  return { visible, dismiss: () => setVisible(false) };
};

export const resetLogoSplash = () => sessionStorage.removeItem(SPLASH_KEY);

import { useEffect, useState } from "react";
import {
  getAppPreferences,
  setAppPreferences,
  subscribeAppPreferences,
  syncSpeedModeDom,
  type AppPreferences,
} from "@/lib/app-preferences";

export function useAppPreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(() => getAppPreferences());

  useEffect(() => {
    setPrefs(getAppPreferences());
    syncSpeedModeDom(getAppPreferences().speedMode);
    return subscribeAppPreferences((next) => {
      setPrefs(next);
      syncSpeedModeDom(next.speedMode);
    });
  }, []);

  const update = (patch: Partial<AppPreferences>) => {
    setPrefs(setAppPreferences(patch));
  };

  return { prefs, update };
}

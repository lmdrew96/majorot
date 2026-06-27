import { useEffect, useState } from "react";
import { useGame } from "./game";

/**
 * True once the persisted save has finished rehydrating from IndexedDB.
 * Components gate their first decision (title vs. resume) on this.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(() => useGame.persist.hasHydrated());

  useEffect(() => {
    const unsub = useGame.persist.onFinishHydration(() => setHydrated(true));
    // Catch the case where hydration finished between render and effect.
    if (useGame.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}

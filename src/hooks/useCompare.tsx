import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { GovernorProfileGov } from "@/components/GovernorProfileCard";

const MAX_COMPARE = 4;

interface CompareContextValue {
  compareSet: GovernorProfileGov[];
  addToCompare: (gov: GovernorProfileGov) => void;
  removeFromCompare: (governorId: string) => void;
  clearCompare: () => void;
  isInCompare: (governorId: string | null) => boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareSet, setCompareSet] = useState<GovernorProfileGov[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addToCompare = useCallback((gov: GovernorProfileGov) => {
    setCompareSet((prev) => {
      if (!gov.governor_id) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((g) => g.governor_id === gov.governor_id)) return prev;
      return [...prev, gov];
    });
  }, []);

  const removeFromCompare = useCallback((governorId: string) => {
    setCompareSet((prev) => prev.filter((g) => g.governor_id !== governorId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareSet([]);
    setDrawerOpen(false);
  }, []);

  const isInCompare = useCallback(
    (governorId: string | null) => {
      if (!governorId) return false;
      return compareSet.some((g) => g.governor_id === governorId);
    },
    [compareSet],
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <CompareContext.Provider
      value={{
        compareSet,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        drawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}

import { useCallback, useEffect, useState } from "react";

/**
 * Keeps "Total price" in sync with calculated line totals until the user edits it.
 */
export function useAutoOfferTotal(suggestedDaily: number | null) {
  const [offerTotal, setOfferTotalState] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (locked || suggestedDaily == null) return;
    setOfferTotalState(String(suggestedDaily));
  }, [suggestedDaily, locked]);

  const setOfferTotal = useCallback((value: string) => {
    setLocked(true);
    setOfferTotalState(value);
  }, []);

  const applyLoadedOfferTotal = useCallback(
    (value: string, suggested: number | null) => {
      const trimmed = value.trim();
      const display =
        trimmed === "" && suggested != null ? String(suggested) : value;
      setOfferTotalState(display);
      setLocked(
        suggested != null &&
          trimmed !== "" &&
          Number(trimmed) !== suggested,
      );
    },
    [],
  );

  const resetToSuggested = useCallback(() => {
    setLocked(false);
    if (suggestedDaily != null) setOfferTotalState(String(suggestedDaily));
  }, [suggestedDaily]);

  const unlockOfferTotal = useCallback(() => {
    setLocked(false);
  }, []);

  const setOfferToZero = useCallback(() => {
    setLocked(true);
    setOfferTotalState("0");
  }, []);

  return {
    offerTotal,
    setOfferTotal,
    applyLoadedOfferTotal,
    resetToSuggested,
    unlockOfferTotal,
    setOfferToZero,
    offerTotalLocked: locked,
  };
}

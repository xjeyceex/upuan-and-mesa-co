"use client";

import { useCallback, useEffect, useState } from "react";
import type { PricingConfig } from "@/lib/pricing-config";

export function usePricingConfig() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/pricing");
      if (!res.ok) throw new Error("Could not load prices");
      setConfig(await res.json());
    } catch {
      setError("Could not load prices");
      setConfig(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { config, loading, error, reload: load };
}

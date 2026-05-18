"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
    setLight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="shrink-0 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
    >
      {light ? "Dark" : "Light"}
    </button>
  );
}

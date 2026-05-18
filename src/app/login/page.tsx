"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { TextField } from "@/components/FormField";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("That password is not correct. Please try again.");
      return;
    }

    const from = searchParams.get("from") || "/";
    router.push(from);
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-5 py-8">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Upuan and Mesa Co.</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to manage your chairs, tables, and rentals.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoFocus
            required
          />

          {error && (
            <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-red-400">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-block">
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted">
          <strong className="text-subtle">Install on Android:</strong> after you sign in, use
          Chrome&apos;s menu → <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          The site must be opened over HTTPS (not plain http on your PC).
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { TextField } from "@/components/FormField";

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
    <div className="flex min-h-full flex-col items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold text-stone-900">Upuan and Mesa Co.</h1>
        <p className="mt-1 text-sm text-stone-600">
          Sign in to manage your chairs, tables, and rentals.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-block"
          >
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 border-t border-stone-100 pt-3 text-[10px] leading-snug text-stone-500 sm:text-xs">
          <strong className="text-stone-700">Install on Android:</strong> after you sign in, use
          Chrome&apos;s menu → <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          The site must be opened over HTTPS (not plain http on your PC).
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-stone-500">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/orders", label: "Rentals", short: "Rentals" },
  { href: "/earnings", label: "Money", short: "Money" },
  { href: "/inventory", label: "Stock", short: "Stock" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-stone-900">Upuan and Mesa Co.</p>
            <p className="text-xs text-stone-500">Chairs & tables</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Log out
          </button>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-1 px-4 pb-3 sm:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  active
                    ? "bg-amber-100 text-amber-900"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Bottom bar on phone — easy to reach with thumb */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white sm:hidden"
        aria-label="Main menu"
      >
        <div className="grid grid-cols-4">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center py-2.5 text-xs font-semibold ${
                  active ? "text-amber-700" : "text-stone-500"
                }`}
              >
                <span className="text-base">{link.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

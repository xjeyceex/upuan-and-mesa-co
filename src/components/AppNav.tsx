"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

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

  function go(href: string) {
    if (pathname !== href && !(href !== "/" && pathname.startsWith(href))) {
      router.push(href);
    }
  }

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-foreground">Upuan and Mesa Co.</p>
            <p className="text-sm text-muted">Chairs & tables</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-elevated hover:text-foreground"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-2 px-5 pb-4 sm:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-surface sm:hidden"
        aria-label="Main menu"
      >
        <div className="grid grid-cols-4">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <button
                key={link.href}
                type="button"
                onClick={() => go(link.href)}
                className={`flex flex-col items-center py-3.5 text-xs font-semibold ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span className="text-base">{link.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

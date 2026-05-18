import { AppNav } from "./AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-stone-50 pb-20 sm:pb-0">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}

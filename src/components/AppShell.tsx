import { AppNav } from "./AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background pb-24 sm:pb-0">
      <AppNav />
      <main className="mx-auto max-w-3xl px-5 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

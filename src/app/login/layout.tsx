import { Suspense } from "react";

/** Shared glassmorphism layout for all /login/* pages */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),rgba(5,5,5,0.98)_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_72%,rgba(16,185,129,0.2),transparent_34%)]" />
      </div>
      <Suspense fallback={null}>{children}</Suspense>
    </main>
  );
}

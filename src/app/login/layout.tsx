import { Suspense } from "react";

/** Shared glassmorphism layout for all /login/* pages */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 overflow-hidden">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.25),rgba(5,5,5,0.98)_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_72%,rgba(234,88,12,0.15),transparent_34%)]" />
        {/* Floating orbs — CSS-only looping animation */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-600/20 blur-[100px] animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-orange-500/15 blur-[100px] animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px] animate-[pulse_6s_ease-in-out_infinite]" />
      </div>

      {/* Branding — fade in */}
      <div className="relative z-10 mb-8 text-center animate-[fadeIn_0.8s_ease-out]">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
          Loankit
        </h1>
        <p className="mt-1.5 text-xs tracking-widest text-slate-500 uppercase">Simple. Powerful. Yours.</p>
      </div>

      {/* Form — slide up + fade in */}
      <div className="animate-[slideUp_0.6s_ease-out]">
        <Suspense fallback={null}>{children}</Suspense>
      </div>

      {/* Version footer */}
      <p className="relative z-10 mt-8 text-[10px] text-slate-600 animate-[fadeIn_1.2s_ease-out]">Loankit v0.2</p>

      {/* Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

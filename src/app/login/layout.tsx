import { Suspense } from "react";

/** Shared glassmorphism layout for all /login/* pages */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Branding */}
      <div className="relative z-10 mb-8 text-center animate-[fadeIn_0.8s_ease-out]">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(200,80,0,0.4)]">
          Loankit
        </h1>
        <p className="mt-2 text-xs tracking-[0.25em] text-white/80 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]">Simple. Powerful. Yours.</p>
      </div>

      {/* Form */}
      <div className="animate-[slideUp_0.6s_ease-out]">
        <Suspense fallback={null}>{children}</Suspense>
      </div>

      {/* Version footer */}
      <p className="relative z-10 mt-8 text-[10px] text-orange-800/50 animate-[fadeIn_1.2s_ease-out]">Loankit v0.2</p>

      {/* Keyframes */}
      <style>{`
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

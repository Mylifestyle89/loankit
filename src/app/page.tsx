import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-gradient-shift absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),rgba(5,5,5,0.98)_45%)]" />
        <div className="landing-gradient-shift absolute inset-0 bg-[radial-gradient(circle_at_78%_72%,rgba(16,185,129,0.2),transparent_34%)] [animation-delay:0.8s]" />
        <div className="landing-gradient-shift absolute inset-0 bg-[radial-gradient(circle_at_24%_80%,rgba(245,158,11,0.12),transparent_32%)] [animation-delay:1.6s]" />
        <div className="landing-line-breathe absolute inset-0 opacity-60 [background:linear-gradient(130deg,transparent_0%,rgba(255,255,255,0.04)_45%,transparent_100%)]" />
      </div>

      {/* SVG animated network lines */}
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <svg className="h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
          <g className="landing-line-breathe" fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="12 8">
            <path d="M120 700 C320 520, 520 640, 760 460 S1180 360, 1480 520" />
            <path d="M60 520 C340 360, 540 420, 780 300 S1180 220, 1500 340" />
            <path d="M180 800 C460 700, 680 760, 940 620 S1260 560, 1540 640" />
          </g>
          <g fill="rgba(99,102,241,0.7)">
            <circle className="landing-node-float" cx="320" cy="470" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.2s]" cx="520" cy="410" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.4s]" cx="760" cy="460" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.6s]" cx="1040" cy="370" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.8s]" cx="1280" cy="420" r="2.5" />
          </g>
          <g fill="rgba(16,185,129,0.65)">
            <circle className="landing-node-float [animation-delay:0.3s]" cx="250" cy="690" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.5s]" cx="510" cy="665" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.7s]" cx="880" cy="620" r="2.5" />
            <circle className="landing-node-float [animation-delay:0.9s]" cx="1180" cy="570" r="2.5" />
          </g>
        </svg>
      </div>

      {/* Hero content — no card wrapper on mobile, glassmorphism card on desktop */}
      <section className="relative mx-auto flex min-h-screen w-full max-w-[1800px] items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
        <div className="relative w-full max-w-[1500px]">
          {/* Glassmorphism card — hidden on mobile, visible on sm+ */}
          <div className="hidden sm:flex w-full items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] shadow-[0_30px_120px_rgba(2,6,23,0.75)] backdrop-blur-[1px]">
            {/* Shimmer sweep */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
              <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent [animation:landing-shimmer_6s_ease-in-out_infinite]" />
            </div>
            <div className="relative z-10 flex w-full flex-col items-center justify-center px-8 py-16 sm:py-20 lg:py-28 text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-orange-400/80">Loan Documents Creator</p>
              <h1 className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl lg:text-7xl xl:text-8xl">
                Simple. Powerful.
                <br />
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text">Yours.</span>
              </h1>
              <p className="mt-6 max-w-md text-base font-medium text-slate-300/70">
                Nền tảng tạo hồ sơ vay thế hệ mới
              </p>
              <div className="mt-10">
                <Link
                  href="/report/khdn"
                  className="landing-button-pulse group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-medium tracking-wide text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/15 hover:shadow-[0_16px_52px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.45)]"
                >
                  <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_42%)]" />
                  <span className="absolute -inset-1 rounded-2xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 group-hover:[background:radial-gradient(circle,rgba(99,102,241,0.45),transparent_60%)]" />
                  <span className="relative">Bắt đầu ngay</span>
                  <svg className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile layout — no card, full-bleed content */}
          <div className="flex sm:hidden flex-col items-center justify-center text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-400/80">Loan Documents Creator</p>
            <h1 className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
              Simple.<br />Powerful.<br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text">Yours.</span>
            </h1>
            <p className="mt-4 max-w-xs text-sm font-medium text-slate-300/70">
              Nền tảng tạo hồ sơ vay thế hệ mới
            </p>
            <div className="mt-10">
              <Link
                href="/report/khdn"
                className="landing-button-pulse group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-7 py-3 text-sm font-medium tracking-wide text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/15 hover:shadow-[0_16px_52px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.45)]"
              >
                <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_42%)]" />
                <span className="absolute -inset-1 rounded-2xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 group-hover:[background:radial-gradient(circle,rgba(99,102,241,0.45),transparent_60%)]" />
                <span className="relative">Bắt đầu ngay</span>
                <svg className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

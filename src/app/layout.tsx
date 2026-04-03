import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "../../node_modules/@eigenpal/docx-js-editor/dist/styles.css";
import "./globals.css";

// Fallback fonts for offline/restricted environments
// In production, consider using local font files via @font-face
const fontVariables = {
  inter: "--font-inter",
  geistSans: "--font-geist-sans",
  geistMono: "--font-geist-mono",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Loankit — Công cụ tạo hồ sơ vay",
  description: "Nền tảng tạo báo cáo đề xuất cho vay, hồ sơ tài sản bảo đảm và chứng từ giải ngân",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Intentional dangerouslySetInnerHTML: theme flash prevention.
            Hardcoded string only — no user input, no XSS risk. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('app_theme');const d=t==='dark'||(t==='system'||!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch{}`,
          }}
        />
        {/* CSS variables for font fallbacks */}
        <style>{`
          :root {
            --font-inter: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --font-geist-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --font-geist-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          }
        `}</style>
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

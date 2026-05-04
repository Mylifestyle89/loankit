import type { NextConfig } from "next";

const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || "http://localhost:8080";

// HSTS only emitted when behind HTTPS (e.g. Tailscale Serve). Harmless on plain HTTP.
const HSTS_ENABLED = process.env.ENABLE_HSTS === "true";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(HSTS_ENABLED
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${ONLYOFFICE_URL}`,
      `style-src 'self' 'unsafe-inline' ${ONLYOFFICE_URL} https://fonts.googleapis.com`,
      `img-src 'self' data: blob: ${ONLYOFFICE_URL}`,
      `frame-src 'self' ${ONLYOFFICE_URL}`,
      `connect-src 'self' ${ONLYOFFICE_URL}`,
      "font-src 'self' data: https://r2cdn.perplexity.ai https://fonts.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-libsql",
  ],
  outputFileTracingIncludes: {
    "/api/loans/\\[id\\]/disbursements/\\[disbursementId\\]/report": [
      "./report_assets/Disbursement templates/**",
    ],
    "/api/report/templates/khcn/disbursement": [
      "./report_assets/KHCN templates/**",
    ],
    "/api/report/templates/khcn/generate": [
      "./report_assets/KHCN templates/**",
    ],
  },
  outputFileTracingExcludes: {
    "/proxy": ["./node_modules/better-sqlite3/**", "./node_modules/@prisma/**", "./prisma/**"],
  },
  async redirects() {
    return [
      { source: "/report/mapping", destination: "/report/khdn/mapping", permanent: true },
      { source: "/report/mapping/:path*", destination: "/report/khdn/mapping/:path*", permanent: true },
      { source: "/report/template", destination: "/report/khdn/template", permanent: true },
      { source: "/report/template/:path*", destination: "/report/khdn/template/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || "http://localhost:8080";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${ONLYOFFICE_URL}`,
      `style-src 'self' 'unsafe-inline' ${ONLYOFFICE_URL}`,
      `img-src 'self' data: blob: ${ONLYOFFICE_URL}`,
      `frame-src 'self' ${ONLYOFFICE_URL}`,
      `connect-src 'self' ${ONLYOFFICE_URL}`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-libsql",
  ],
  outputFileTracingExcludes: {
    "/proxy": ["./node_modules/better-sqlite3/**", "./node_modules/@prisma/**", "./prisma/**"],
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

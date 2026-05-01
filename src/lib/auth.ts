import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, twoFactor } from "better-auth/plugins";
import { prisma } from "./prisma";

function sanitizeEnv(value?: string): string | undefined {
  return value?.replace(/\\r/g, "").replace(/\\n/g, "").trim();
}

const configuredAuthUrl = sanitizeEnv(process.env.BETTER_AUTH_URL);
const vercelUrl = sanitizeEnv(process.env.VERCEL_URL);
const vercelProjectUrl = sanitizeEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL);
const vercelBranchUrl = sanitizeEnv(process.env.VERCEL_BRANCH_URL);

const trustedOrigins = Array.from(
  new Set(
    [
      configuredAuthUrl,
      vercelUrl ? `https://${vercelUrl}` : undefined,
      vercelProjectUrl ? `https://${vercelProjectUrl}` : undefined,
      vercelBranchUrl ? `https://${vercelBranchUrl}` : undefined,
    ].filter((value): value is string => Boolean(value)),
  ),
);

// Resolve base URL: explicit env > Vercel production URL > Vercel deploy URL
const resolvedBaseUrl = configuredAuthUrl
  || (vercelProjectUrl ? `https://${vercelProjectUrl}` : undefined)
  || (vercelUrl ? `https://${vercelUrl}` : undefined);

export const auth = betterAuth({
  ...(resolvedBaseUrl ? { baseURL: resolvedBaseUrl } : {}),
  ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    // Invite-only: disable public signup. Admin creates users via admin plugin.
    disableSignUp: true,
  },
  session: {
    expiresIn: 8 * 60 * 60,  // 8h — 1 ca làm việc
    updateAge: 1 * 60 * 60,  // renew mỗi 1h nếu user active
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache before DB re-check
    },
  },
  plugins: [
    admin({
      defaultRole: "viewer",
      adminRoles: ["admin"],
    }),
    // 2FA TOTP: only active on Vercel (ENABLE_2FA=true), disabled on offline workstations
    ...(process.env.ENABLE_2FA === "true"
      ? [twoFactor({ issuer: "LoanKit" })]
      : []),
  ],
});

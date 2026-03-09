import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    // Invite-only: disable public signup. Admin creates users via admin plugin.
    disableSignUp: true,
  },
  session: {
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
  ],
});

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

// Export commonly used hooks/methods
export const { signIn, signOut, useSession } = authClient;

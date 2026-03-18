"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect old /report/users URL to system-operations page */
export default function UsersPageRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/report/system-operations"); }, [router]);
  return null;
}

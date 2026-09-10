"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api";

// Registers Clerk's getToken with the API client so every request
// carries a fresh bearer token, without threading it through call sites.
export function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
    return () => setTokenGetter(null);
  }, [getToken]);

  return null;
}

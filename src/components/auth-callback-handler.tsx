"use client";

import { useEffect, useState, type ReactNode } from "react";
import { handleAuthCallback } from "@netlify/identity";

const authHashPattern = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

export function AuthCallbackHandler({ children }: { children: ReactNode }) {
  const [processing, setProcessing] = useState(
    () => typeof window !== "undefined" && authHashPattern.test(window.location.hash),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authHashPattern.test(window.location.hash)) return;
    handleAuthCallback()
      .then(() => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setProcessing(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Sign in failed.");
        setProcessing(false);
      });
  }, []);

  if (error) return <main className="auth-callback"><p>{error}</p></main>;
  if (processing) return <main className="auth-callback"><p>Completing sign in…</p></main>;
  return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function finishSignIn() {
      const code = new URLSearchParams(window.location.search).get("code");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase sign-in is not configured.");
        return;
      }
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }
      router.replace("/");
    }
    void finishSignIn();
  }, [router]);

  return <main className="auth-callback"><p>{error || "Completing sign in…"}</p></main>;
}
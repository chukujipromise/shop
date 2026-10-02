"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Netlify Identity callbacks are handled globally by AuthCallbackHandler in the root layout.
export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => router.replace("/"), [router]);
  return <main className="auth-callback"><p>Completing sign in…</p></main>;
}

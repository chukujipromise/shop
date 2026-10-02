"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { products } from "@/lib/products";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const categories = ["All pieces", "Desk", "Audio", "Travel"];

function ShopContent() {
  const [category, setCategory] = useState("All pieces");
  const [notice, setNotice] = useState("");
  const [signedInAs, setSignedInAs] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const { addItem, itemCount } = useCart();
  const visibleProducts = products.filter(
    (product) => category === "All pieces" || product.category === category,
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedInAs(data.session?.user.email ?? ""));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInAs(session?.user.email ?? "");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Add your Supabase project keys to .env.local to enable sign-in.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setAuthError(error.message);
      setAuthBusy(false);
    }
  }

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Add your Supabase project keys to .env.local to enable sign-in.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    const result = authMode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

    setAuthBusy(false);
    if (result.error) {
      setAuthError(result.error.message);
      return;
    }
    if (authMode === "sign-up" && !result.data.session) {
      setAuthError("Check your email for a confirmation link to finish creating your account.");
      return;
    }
    setSignedInAs(result.data.user?.email ?? authEmail);
    setAuthOpen(false);
    setAuthPassword("");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
  }

  function addToBag(productId: string) {
    addItem(productId);
    setNotice("Added to your bag.");
    window.setTimeout(() => setNotice(""), 2400);
  }

  return (
    <main>
      <div className="announcement">Complimentary shipping on orders over $120</div>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Form and Field home">
          form<span>/</span>field
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#shop">Shop all</a>
          <a href="#story">Our point of view</a>
        </nav>
        <div className="header-actions">
          <button className="text-button sign-in" onClick={signedInAs ? signOut : () => { setAuthError(""); setAuthOpen(true); }}>
            {signedInAs ? "Sign out" : "Sign in / Sign up"}
          </button>
          <Link className="bag-link" href="/checkout" aria-label={`Shopping bag, ${itemCount} items`}>
            Bag <span className="bag-count">{itemCount}</span>
          </Link>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Objects for the everyday</p>
          <h1 id="hero-title">Make room<br />for <em>better.</em></h1>
          <p className="hero-description">
            Considered essentials for the places you work, wander, and come back to.
          </p>
          <a className="button button-dark" href="#shop">Shop the collection <span aria-hidden="true">↘</span></a>
          <div className="hero-index"><span>01</span> / 04 <i /></div>
        </div>
        <div className="hero-image" role="img" aria-label="Sunlit modern interior with considered home objects">
          <div className="hero-image-caption"><span>01 — The quiet edit</span><span>Objects with intention</span></div>
        </div>
        <div className="hero-note">LESS, BUT<br />CONSIDERED.</div>
      </section>

      <section className="collection section-wrap" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A good place to start</p>
            <h2>Keepers, not clutter.</h2>
          </div>
          <p className="section-aside">Useful things, made thoughtfully.<br />Chosen to stay in your orbit.</p>
        </div>
        <div className="collection-toolbar">
          <div className="category-tabs" role="group" aria-label="Filter products by category">
            {categories.map((name) => (
              <button
                className={`category-tab${category === name ? " active" : ""}`}
                key={name}
                onClick={() => setCategory(name)}
                aria-pressed={category === name}
              >
                {name}
              </button>
            ))}
          </div>
          <span className="product-count">{visibleProducts.length} considered objects</span>
        </div>
        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <article className="product" key={product.id}>
              <div
                className={`product-image product-image-${index + 1}`}
                role="img"
                aria-label={product.name}
                style={{ backgroundImage: `url("${product.image}")` }}
              >
                <span className="product-label">{product.label}</span>
                <button className="quick-add" onClick={() => addToBag(product.id)} aria-label={`Add ${product.name} to bag`}>+</button>
              </div>
              <div className="product-details">
                <div><h3>{product.name}</h3><p>{product.description}</p></div>
                <span>${product.price}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="collection-bottom"><span>Built for daily use. Chosen to last.</span><a href="#story">Why Form / Field <span aria-hidden="true">↗</span></a></div>
      </section>

      <section className="story-band" id="story">
        <div className="story-number">F / F<br /><span>EST. 2024</span></div>
        <p>Good design doesn’t ask for attention.<br /><em>It earns a place in your day.</em></p>
        <span className="story-mark" aria-hidden="true">✳</span>
      </section>

      <footer className="site-footer">
        <Link className="wordmark" href="/">form<span>/</span>field</Link>
        <span>Objects for a life in motion.</span>
        <a href="#shop">Back to the collection ↑</a>
      </footer>
      {notice && <div className="notice" role="status">{notice}</div>}
      {authOpen && (
        <div className="auth-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="auth-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Close sign in dialog">×</button>
            <p className="eyebrow">Form / Field account</p>
            <h2 id="auth-title">{authMode === "sign-in" ? "Welcome back." : "Make yourself at home."}</h2>
            <p className="auth-intro">{authMode === "sign-in" ? "Sign in to continue." : "Create an account to get started."}</p>
            <form className="auth-form" onSubmit={submitCredentials}>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={authMode === "sign-in" ? "current-password" : "new-password"}
                minLength={6}
                required
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
              {authError && <p className="auth-error" role="alert">{authError}</p>}
              <button className="button button-dark auth-submit" type="submit" disabled={authBusy}>
                {authBusy ? "Please wait…" : authMode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <button className="auth-google" type="button" onClick={signInWithGoogle} disabled={authBusy}>
              Continue with Google
            </button>
            <p className="auth-switch">
              {authMode === "sign-in" ? "New here?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => { setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in"); setAuthError(""); }}>
                {authMode === "sign-in" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return <ShopContent />;
}

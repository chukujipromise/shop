"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { products } from "@/lib/products";

type CheckoutResponse = { orderId?: string; emailSent?: boolean; error?: string };

export default function CheckoutPage() {
  const { items, subtotal, removeItem, clearCart } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CheckoutResponse | null>(null);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        fullName: form.get("fullName"),
        address: form.get("address"),
        city: form.get("city"),
        postalCode: form.get("postalCode"),
        items,
      }),
    });
    const result = await response.json() as CheckoutResponse;
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "We couldn't place your order. Please try again.");
      return;
    }
    setOrder(result);
    clearCart();
  }

  return (
    <main className="checkout-page">
      <header className="checkout-top">
        <Link className="wordmark" href="/">form<span>/</span>field</Link>
        <Link href="/">← Continue shopping</Link>
      </header>
      <div className="checkout-shell">
        <section className="checkout-main">
          <p className="eyebrow">The good part is almost here</p>
          <h1>Checkout</h1>
          {order ? (
            <div className="success-panel" role="status">
              <h2>Order received.</h2>
              <p>Your reference is <strong>{order.orderId}</strong>. {order.emailSent ? "A confirmation is on its way." : "Your order is saved. Email confirmation is not configured yet."}</p>
              <Link className="button button-dark" href="/">Back to the collection</Link>
            </div>
          ) : (
            <form className="checkout-form" onSubmit={placeOrder}>
              <h2 className="form-section-title">Contact</h2>
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
              <h2 className="form-section-title">Delivery</h2>
              <label>Full name<input name="fullName" autoComplete="name" required /></label>
              <label>Street address<input name="address" autoComplete="street-address" required /></label>
              <div className="form-row">
                <label>City<input name="city" autoComplete="address-level2" required /></label>
                <label>Postal code<input name="postalCode" autoComplete="postal-code" required /></label>
              </div>
              {error && <p className="checkout-error" role="alert">{error}</p>}
              <button className="button button-dark checkout-submit" type="submit" disabled={busy || items.length === 0}>
                {busy ? "Placing order…" : "Place order"}<span aria-hidden="true">↗</span>
              </button>
              <p className="secure-note">Orders are saved securely. Payment processing is not enabled in this starter.</p>
            </form>
          )}
        </section>
        <aside className="order-summary" aria-label="Order summary">
          <h2>Your bag</h2>
          {items.length === 0 ? (
            <p className="empty-bag">Your bag is taking a quiet moment. <Link href="/">Find something good →</Link></p>
          ) : items.map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            if (!product) return null;
            return (
              <div className="summary-line" key={item.productId}>
                <span>{product.name}<small>Qty {item.quantity} · <button className="text-button" type="button" onClick={() => removeItem(item.productId)}>Remove</button></small></span>
                <span>${(product.price * item.quantity).toFixed(2)}</span>
              </div>
            );
          })}
          {items.length > 0 && <>
            <div className="summary-line"><span>Shipping</span><span>{subtotal >= 120 ? "Complimentary" : "$8.00"}</span></div>
            <div className="summary-line total"><span>Total</span><span>${(subtotal + (subtotal >= 120 ? 0 : 8)).toFixed(2)}</span></div>
          </>}
        </aside>
      </div>
    </main>
  );
}
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { products } from "@/lib/products";

type CartLine = { productId: string; quantity: number };
type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "form-field-cart";
const cartIdKey = "form-field-cart-id";

function isCartLines(value: unknown): value is CartLine[] {
  return Array.isArray(value) && value.every((item) =>
    item &&
    typeof item.productId === "string" &&
    products.some((product) => product.id === item.productId) &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= 20,
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [cartId, setCartId] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isCartLines(parsed)) setItems(parsed);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    let id = localStorage.getItem(cartIdKey);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(cartIdKey, id);
    }
    setCartId(id);

    async function restoreRemoteCart() {
      try {
        const response = await fetch(`/api/cart?id=${encodeURIComponent(id!)}`);
        if (response.ok) {
          const data: unknown = await response.json();
          if (data && typeof data === "object" && "items" in data && isCartLines(data.items)) {
            setItems(data.items);
          }
        }
      } catch {
        // Keep the locally saved cart available when the database is offline.
      } finally {
        setRemoteReady(true);
      }
    }
    void restoreRemoteCart();
  }, [ready]);

  useEffect(() => {
    if (!ready || !remoteReady || !cartId) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cartId, items }),
      }).catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [cartId, items, ready, remoteReady]);

  function addItem(productId: string) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      return existing
        ? current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(item.quantity + 1, 20) } : item)
        : [...current, { productId, quantity: 1 }];
    });
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, removeItem, clearCart: () => setItems([]) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
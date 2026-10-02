import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { products } from "@/lib/products";

type CartLine = { productId: string; quantity: number };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return typeof line.productId === "string" &&
    products.some((product) => product.id === line.productId) &&
    Number.isInteger(line.quantity) &&
    Number(line.quantity) >= 1 &&
    Number(line.quantity) <= 20;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuidPattern.test(id)) return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Cart storage is not configured." }, { status: 503 });

  const { data, error } = await supabase.from("shopping_carts").select("items").eq("id", id).maybeSingle();
  if (error) {
    console.error("Cart lookup failed", error.message);
    return NextResponse.json({ error: "Cart storage is unavailable." }, { status: 503 });
  }
  return NextResponse.json({ items: data?.items ?? [] });
}

export async function PUT(request: Request) {
  let body: { id?: unknown; items?: unknown };
  try {
    body = await request.json() as { id?: unknown; items?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }
  if (
    typeof body.id !== "string" || !uuidPattern.test(body.id) ||
    !Array.isArray(body.items) || body.items.length > 40 || !body.items.every(isCartLine)
  ) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Cart storage is not configured." }, { status: 503 });

  const { error } = await supabase.from("shopping_carts").upsert({ id: body.id, items: body.items, updated_at: new Date().toISOString() });
  if (error) {
    console.error("Cart save failed", error.message);
    return NextResponse.json({ error: "Cart storage is unavailable." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
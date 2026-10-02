import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { shoppingCarts } from "../../../../db/schema";
import { products } from "@/lib/products";

type CartLine = { productId: string; quantity: number };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  try {
    const [cart] = await db.select({ items: shoppingCarts.items }).from(shoppingCarts).where(eq(shoppingCarts.id, id));
    return NextResponse.json({ items: cart?.items ?? [] });
  } catch (error) {
    console.error("Cart lookup failed", error);
    return NextResponse.json({ error: "Cart storage is unavailable." }, { status: 503 });
  }
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
  const items = body.items as CartLine[];
  try {
    await db.insert(shoppingCarts)
      .values({ id: body.id, items, updatedAt: new Date() })
      .onConflictDoUpdate({ target: shoppingCarts.id, set: { items, updatedAt: new Date() } });
  } catch (error) {
    console.error("Cart save failed", error);
    return NextResponse.json({ error: "Cart storage is unavailable." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
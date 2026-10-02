import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CartEntry = { productId: string; quantity: number };
type CheckoutBody = {
  email?: string;
  fullName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  items?: CartEntry[];
};

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
  }

  let body: CheckoutBody;
  try {
    body = await request.json() as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
  }

  const { email, fullName, address, city, postalCode } = body;
  if (
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !isText(fullName, 120) || !isText(address, 240) ||
    !isText(city, 100) || !isText(postalCode, 32) ||
    !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 40
  ) {
    return NextResponse.json({ error: "Check your contact, delivery, and bag details." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const item of body.items) {
    if (!item || typeof item.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return NextResponse.json({ error: "One or more items in your bag are invalid." }, { status: 400 });
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  if ([...quantities.values()].some((quantity) => quantity > 20)) {
    return NextResponse.json({ error: "A maximum of 20 of each item can be ordered." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const productIds = [...quantities.keys()];
  const { data: catalog, error: catalogError } = await supabase
    .from("products")
    .select("id, name, price")
    .in("id", productIds)
    .eq("active", true);
  if (catalogError) {
    console.error("Product lookup failed", catalogError.message);
    return NextResponse.json({ error: "We couldn't verify your bag. Please try again." }, { status: 503 });
  }
  if (!catalog || catalog.length !== productIds.length) {
    return NextResponse.json({ error: "A product in your bag is no longer available." }, { status: 400 });
  }

  const productById = new Map(catalog.map((product) => [product.id, product]));
  const orderItems = productIds.map((productId) => {
    const product = productById.get(productId)!;
    return { product_id: productId, product_name: product.name, unit_price: product.price, quantity: quantities.get(productId)! };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0);
  const shipping = subtotal >= 120 ? 0 : 8;
  const total = subtotal + shipping;

  const { data: orderId, error: orderError } = await supabase.rpc("create_shop_order", {
    customer_email: email.trim().toLowerCase(),
    customer_name: fullName.trim(),
    shipping_address: address.trim(),
    shipping_city: city.trim(),
    shipping_postal_code: postalCode.trim(),
    order_subtotal: subtotal,
    shipping_amount: shipping,
    order_total: total,
    order_items: orderItems,
  });
  if (orderError || !orderId) {
    console.error("Order creation failed", orderError?.message);
    return NextResponse.json({ error: "We couldn't save your order. Please try again." }, { status: 503 });
  }

  const emailSent = await sendConfirmationEmail({
    email: email.trim(),
    name: fullName.trim(),
    orderId: String(orderId),
    items: orderItems,
    total,
  });

  return NextResponse.json({ orderId, emailSent }, { status: 201 });
}

async function sendConfirmationEmail(order: {
  email: string;
  name: string;
  orderId: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
  total: number;
}) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  if (!apiKey || !domain || !from) return false;

  const itemLines = order.items.map((item) => `${item.quantity} × ${item.product_name} — $${(Number(item.unit_price) * item.quantity).toFixed(2)}`).join("\n");
  const message = new FormData();
  message.set("from", from);
  message.set("to", order.email);
  message.set("subject", `Your Form / Field order ${order.orderId}`);
  message.set("text", `Hi ${order.name},\n\nThanks for your order.\n\n${itemLines}\n\nTotal: $${order.total.toFixed(2)}\nOrder reference: ${order.orderId}\n\nForm / Field`);

  try {
    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` },
      body: message,
    });
    if (!response.ok) console.error("Mailgun delivery failed", response.status);
    return response.ok;
  } catch (error) {
    console.error("Mailgun request failed", error);
    return false;
  }
}
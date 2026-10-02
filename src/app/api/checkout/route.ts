import { NextResponse } from "next/server";
import { getUser } from "@netlify/identity";
import { db } from "../../../../db";
import { orderItems as orderItemsTable, orders } from "../../../../db/schema";
import { products } from "@/lib/products";

type CartEntry = { productId: string; quantity: number };
type CheckoutBody = {
  email?: string;
  fullName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  items?: CartEntry[];
};

function isText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = await request.json() as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
  }

  if (
    typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
    !isText(body.fullName, 120) || !isText(body.address, 240) ||
    !isText(body.city, 100) || !isText(body.postalCode, 32) ||
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

  const productIds = [...quantities.keys()];
  const productById = new Map(products.map((product) => [product.id, product]));
  if (productIds.some((productId) => !productById.has(productId))) {
    return NextResponse.json({ error: "A product in your bag is no longer available." }, { status: 400 });
  }

  const orderItems = productIds.map((productId) => {
    const product = productById.get(productId)!;
    return { product_id: productId, product_name: product.name, unit_price: product.price, quantity: quantities.get(productId)! };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const shipping = subtotal >= 120 ? 0 : 8;
  const total = subtotal + shipping;
  const user = await getUser();

  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        userId: user?.id ?? null,
        customerEmail: body.email!.trim().toLowerCase(),
        customerName: body.fullName!.trim(),
        shippingAddress: body.address!.trim(),
        shippingCity: body.city!.trim(),
        shippingPostalCode: body.postalCode!.trim(),
        subtotal: subtotal.toFixed(2),
        shippingAmount: shipping.toFixed(2),
        total: total.toFixed(2),
      }).returning({ id: orders.id });
      await tx.insert(orderItemsTable).values(orderItems.map((item) => ({
        orderId: order.id,
        productId: item.product_id,
        productName: item.product_name,
        unitPrice: item.unit_price.toFixed(2),
        quantity: item.quantity,
      })));
      return order.id;
    });
  } catch (error) {
    console.error("Order creation failed", error);
    return NextResponse.json({ error: "We couldn't save your order. Please try again." }, { status: 503 });
  }

  const emailSent = await sendConfirmationEmail({
    email: body.email.trim(),
    name: body.fullName!.trim(),
    orderId,
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
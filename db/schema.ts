import { bigserial, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type CartLine = { productId: string; quantity: number };

export const orders = pgTable("orders", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text("user_id"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingPostalCode: text("shipping_postal_code").notNull(),
  subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
  shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }).notNull(),
  total: numeric({ precision: 10, scale: 2 }).notNull(),
  status: text().notNull().default("placed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: bigserial({ mode: "number" }).primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer().notNull(),
});

export const shoppingCarts = pgTable("shopping_carts", {
  id: uuid().primaryKey(),
  items: jsonb().$type<CartLine[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
